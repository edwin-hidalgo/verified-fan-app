// One synthesis implementation for live and offline contexts. No DOM dependencies.
// Inlined from everything-hums js/song/note.js:185. Importing it pulled in note.js -> stem.js
// (~95 KB) for a four-element array, and the only code that reads it sits behind
// `residualPlayback.enabled`, which is false by default.
const RESIDUAL_BANDS = [[0, 1000], [1000, 2500], [2500, 5000], [5000, 8000]];

export const loudness = f =>
  f < 330 ? Math.min(2.2, Math.pow(330 / f, 0.45)) :
  f > 1400 ? Math.pow(1400 / f, 0.12) : 1;

export const VOICES = [
  { name: 'keys',    cutoff: 4200, atk: 0.008, dec: 1.6,  gain: 1.15, kind: 'harm', h: [[1, 1], [2, 0.38], [3, 0.14]] },
  { name: 'pluck',   cutoff: 1600, atk: 0.008, dec: 0.9,  gain: 1.1,  kind: 'tri' },
  { name: 'bell',    cutoff: 3800, atk: 0.008, dec: 2.2,  gain: 0.9,  kind: 'fm', ratio: 2, index: 0.5 },
  { name: 'marimba', cutoff: 3200, atk: 0.008, dec: 0.55, gain: 1.2,  kind: 'harm', h: [[1, 1], [4, 0.35]] },
  { name: 'flute',   cutoff: 3000, atk: 0.09,  dec: 0,    gain: 0.8,  kind: 'harm', h: [[1, 1], [2, 0.10]], vib: [4.5, 0.004] },
  { name: 'strings', cutoff: 1600, atk: 0.16,  dec: 0,    gain: 0.9,  kind: 'detune', detune: 1.008 },
  { name: 'chime',   cutoff: 5000, atk: 0.008, dec: 1.9,  gain: 0.8,  kind: 'harm', h: [[1, 1], [3.984, 0.22]] },
  { name: 'bass',    cutoff: 1200, atk: 0.05,  dec: 0,    gain: 1.05, kind: 'harm', h: [[1, 1], [2, 0.22]] },
  { name: '8bit',    cutoff: 950,  atk: 0.03,  dec: 0,    gain: 0.5,  kind: 'square' },
];


export const AUDIO_START = 0.08;
// The residual layer's gate. OFF by default and in the product until a
// blinded listening pair passes (HANDOFF v3.83, v3.88); tests and render
// tools turn it on deliberately with setResidualPlayback(true).
export const residualPlayback = { enabled: false };
export function setResidualPlayback(on) { residualPlayback.enabled = !!on; }
export const EFFECT_TAIL = 2.4; // eight dark-delay repeats (< -80 dB at feedback .3)
// A note may carry its OWN voice spec (`ev.timbre`, same shape as VOICES) —
// that is how photo-native instruments work: nine fixed recipes become anchor
// points and a photo's colours land anywhere between them. Without one, the
// index picks a recipe exactly as it always has.
export const voiceOf = ev => ev?.timbre || VOICES[ev?.voice ?? 1] || VOICES[1];

// A note's own deterministic jitter, in -1..1. Derived from where the note sits
// and what pitch it is, so it differs between notes and never differs between
// two renders of the same note. `salt` picks an independent stream, so pitch
// and level do not move together.
function jitter(ev, salt) {
  let h = Math.imul(Math.round((ev.t ?? 0) * 977), 0x9e3779b1)
        ^ Math.imul(Math.round((ev.freq ?? 0) * 16), 0x85ebca6b)
        ^ Math.imul(salt, 0x27d4eb2f);
  h = Math.imul(h ^ (h >>> 15), 0xc2b2ae35);
  h ^= h >>> 16;
  return ((h >>> 0) / 0xffffffff) * 2 - 1;
}

// Continue beyond the ANALYSIS window: its endpoint is not a note-off.
// Fit each partial's recent log-amplitude slope (1/s), keeping spectral decay
// independent. Anchor at the measured endpoint, never at an invented zero.
// This predicts a tail, not the unobserved recording. Rising/flat envelopes
// cannot identify a release: use a bounded Gaussian there. A safety damping
// after 1s also bounds extrapolation of slow decays; all tails end below -100dB.
// Shared by the synth and the isolated note harness, in absolute seconds even
// when the body is stretched. Pitch holds at its last trusted contour value.
export function partialRelease(rows, sourceDur) {
  const rates = rows.map(row => {
    const dt = sourceDur / Math.max(1, row.length - 1);
    const count = Math.min(row.length, Math.max(3, Math.ceil(0.2 / dt)));
    let x = 0, y = 0, xx = 0, xy = 0;
    for (let i = 0; i < count; i++) {
      const time = i * dt, log = Math.log(Math.max(1e-5, row[row.length - count + i]));
      x += time; y += log; xx += time * time; xy += time * log;
    }
    const slope = (count * xy - x * y) / Math.max(1e-12, count * xx - x * x);
    return Math.min(60, Math.max(0, -slope));
  });
  const at = (p, sec) => Math.max(0, rows[p].at(-1)) *
    Math.exp(-rates[p] * sec - (Math.max(0, sec - (rates[p] >= 1 ? 1 : 0)) / 0.28) ** 2);
  let steps = 1;
  while (steps < 200 && rows.some((_, p) => at(p, steps / 100) > 1e-5)) steps++;
  const duration = steps / 100;
  const curves = rows.map((_, p) => Float32Array.from({ length: steps + 1 },
    (_, i) => i === steps ? 0 : at(p, i / 100)));
  return { rates, duration, curves };
}

// Continue the terminal measured band shares against the SAME harmonic
// power trajectory as the partial release. Shares are ratios, not gains:
// fading the noise with a separate clock changes the breath/tonal balance.
// This builds coefficients only; it does not open the residual playback gate.
export function residualReleaseCurves(partialCurves, shares, sampleRate) {
  const total = Math.min(0.9, shares.reduce((sum, q) => sum + Math.max(0, q), 0));
  return RESIDUAL_BANDS.map(([lo, hi], b) => {
    const fc = Math.sqrt(Math.max(60, lo) * hi), Q = fc / (hi - Math.max(60, lo));
    const bpPower = (1 / 3) * ((Math.PI / 2) * (fc / Q)) / (sampleRate / 2);
    return Float32Array.from(partialCurves[0] || [0, 0], (_, i) => {
      const hp = partialCurves.reduce((sum, row) => sum + row[i] ** 2 / 2, 0);
      return Math.sqrt(hp * Math.max(0, shares[b] || 0) / (1 - total) / bpPower);
    });
  });
}

export function noteEnd(ev, secPerBeat) {
  const dur = Math.max(0.28, ev.dur * secPerBeat);
  const v = voiceOf(ev);
  if (v.partials) return dur + partialRelease(v.partials, v.partialsDur || 0.5).duration + 0.05;
  return (v.dec ? Math.min(dur + 0.4, v.dec) : dur) + 0.05;
}

export function createSynth(ctx, destination = ctx.destination) {
  const MIN_NOTE_SEC = 0.28;
// How much of a struck voice survives its own strike and rings on (v3.62).
const DECAY_FLOOR = 0.22;
  let bus;
  let currentNodes = null;
  const graphNodes = [];
  const active = new Set();
  const offlineEnded = [];
  const node = kind => {
    const n = ctx[kind]();
    (currentNodes || graphNodes).push(n);
    return n;
  };

  // PeriodicWaves are immutable and context-bound: build each spectrum once
  // and share it across every note that uses it (a fresh one per note would
  // allocate thousands over a loop).
  const waveCache = new Map();
  const periodicWave = bins => {
    const key = Array.from(bins).join(',');
    let w = waveCache.get(key);
    if (!w) {
      const imag = Float32Array.from([0, ...bins]);
      w = ctx.createPeriodicWave(new Float32Array(imag.length), imag, { disableNormalization: false });
      waveCache.set(key, w);
    }
    return w;
  };

  // Own every node, including FM/vibrato sources and partial gains. Every
  // natural end or explicit stop releases the complete group.
  function track(render, voices, layer, start) {
    const nodes = [];
    const records = [];
    currentNodes = nodes;
    try { render(records); } finally { currentNodes = null; }
    const sources = nodes.filter(n => typeof n.start === 'function');
    let remaining = sources.length;
    const cleanup = () => {
      // Offline rendering may outrun main-thread onended callbacks. Defer
      // disconnection until rendering completes so filter tails are deterministic.
      if (typeof ctx.startRendering === 'function') offlineEnded.push(...nodes);
      else for (const n of nodes) n.disconnect();
      active.delete(group);
    };
    const group = {
      // `start` is exposed so the engine can tell what has already been heard
      // from what is merely queued: a live tempo change re-places the future
      // and must leave a sounding note alone. stop() below already draws the
      // same distinction — it just never said so out loud.
      until: Math.max(...records.map(r => r.until)), layer, start,
      stop(now) {
        for (const gain of new Set(records.map(r => r.gain))) {
          const param = gain.gain;
          if (start > now) { param.cancelScheduledValues(now); param.setValueAtTime(0, now); }
          else {
            if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now);
            else { const value = param.value; param.cancelScheduledValues(now); param.setValueAtTime(value, now); }
            param.linearRampToValueAtTime(0, now + 0.06);
          }
        }
        for (const src of sources) { try { src.stop(now + 0.1); } catch {} }
      },
    };
    for (const src of sources) src.onended = () => { if (--remaining === 0) cleanup(); };
    active.add(group);
    voices.push(group);
  }
  function buildGraph() {
    bus = node('createGain');
    bus.gain.value = 0.75;

    const shaper = node('createWaveShaper');
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 511.5 - 1) * 2;
      curve[i] = Math.tanh(x * 1.15) / Math.tanh(2.3);
    }
    shaper.curve = curve;
    shaper.oversample = '2x';

    // one short dark delay; highpass inside the feedback loop keeps lows from piling up
    const send = node('createGain'); send.gain.value = 0.16;
    const delay = node('createDelay'); delay.delayTime.value = 0.3;
    const feedback = node('createGain'); feedback.gain.value = 0.3;
    const hp = node('createBiquadFilter'); hp.type = 'highpass'; hp.frequency.value = 220;
    const lp = node('createBiquadFilter'); lp.type = 'lowpass'; lp.frequency.value = 3200;

    // ── the record's own tone (v3.64) ─────────────────────────────────────
    // Five peaking filters at FIXED frequencies, flat until a song asks for
    // otherwise. This is where a record's character reaches the ear, because
    // it cannot reach it through `wave`: that table is normalised twice, once
    // against the record's own average and once to max = 1, so every absolute
    // fact about the record is divided out before it ever gets here (see
    // songToneFrom in js/song/palette.js).
    //
    // Fixed in Hz, deliberately. Harmonics move with the note being played;
    // formants do not, and it is the unmoving resonance that reads as a body,
    // a cabinet, a room — the thing that stays recognisable across a melody.
    // Built once and only ever re-gained, so switching songs never rebuilds
    // the graph. A peaking filter at 0dB is flat, so the default costs nothing.
    toneNodes.length = 0;
    let tail = bus;
    for (let i = 0; i < 5; i++) {
      const f = node('createBiquadFilter');
      f.type = 'peaking';
      f.frequency.value = 1000;    // a real one arrives with the first song
      f.Q.value = 0.7;             // broad: these are bands, not notches
      f.gain.value = 0;
      tail.connect(f);
      tail = f;
      toneNodes.push(f);
    }
    applyTone();

    tail.connect(shaper);
    tail.connect(send).connect(delay);
    delay.connect(hp).connect(lp).connect(feedback).connect(delay);
    delay.connect(shaper);
    shaper.connect(destination);
  }

  // Schedule one note of a given voice at absolute context time t.
  function scheduleEventRaw(ev, t, secPerBeat, voices) {
    const dur = Math.max(MIN_NOTE_SEC, ev.dur * secPerBeat);
    const V = voiceOf(ev); // ev.timbre wins; otherwise the indexed recipe
    // ── no two notes exactly alike (v3.65) ────────────────────────────────
    // Every note of a voice used to be bit-identical, which no player has ever
    // managed and which the ear reads as a sequencer rather than an instrument.
    //
    // NOT Math.random. The WAV export and the live graph are required to match
    // within 1e-6 (test/audio-cases.js), a shared hum has to rebuild exactly
    // from its URL, and the golden suite pins the result — randomness would
    // break all three. A hash of the note's OWN position and pitch varies
    // between notes and is identical every time that same note is played,
    // which is what "humanised" needs to mean here.
    //
    // `kind: 'wave'` voices only — which is SONG voices and PHOTO-NATIVE
    // voices, not just song ones (js/timbre.js emits kind:'wave' too; an
    // earlier version of this comment claimed "song voices only" and Codex's
    // review caught the overclaim). Both are derived voices, so both get the
    // humanisation. The indexed nine are hand-tuned, Edwin likes them as they
    // are, and they are what the golden fixtures pin — they stay bit-identical.
    const human = V.kind === 'wave';
    const noteFreq = human ? ev.freq * Math.pow(2, jitter(ev, 1) * 0.05 / 12) : ev.freq;
    const peak = 0.16 * V.gain * ev.gain * loudness(ev.freq) * (human ? 1 + jitter(ev, 2) * 0.07 : 1);
    // envelope end: decaying voices ring out on their own clock; sustained
    // voices hold for the note's duration.
    //
    // `decRel` (v3.62) is the third case, and it exists because a fixed decay
    // is what made song-derived instruments sound like dots. A struck cluster
    // was given dec ~0.25s from its brightness alone, and the drawing's notes
    // are ~3.76 beats — measured, two of three real songs were already SILENT
    // one second into a 1.9-second note. The nine do not set it and are
    // untouched.
    const release = V.partials ? partialRelease(V.partials, V.partialsDur || 0.5) : null;
    const end = release ? dur + release.duration : V.decRel ? dur : (V.dec ? Math.min(dur + 0.4, V.dec) : dur);

    // ── a cutoff the note can move (v3.74) ────────────────────────────────
    // `cutoff` is absolute in Hz, which is right for a voice that was designed
    // at a pitch and wrong for one that was MEASURED at a pitch and is then
    // played somewhere else. A stem-derived voice carries its instrument's own
    // sixteen partials, and a record's bass is measured around 39-70Hz while
    // the picture plays it two or three octaves up — so an absolute cutoff
    // taken from the stem's centroid deletes the very thing that was measured.
    // Every bass voice of the first four records came out at the 900Hz clamp
    // floor and kept THREE of its partials: 41-89% of its energy gone, and
    // four different records flattened toward the same narrow tone.
    //
    // `cutoffHarm` says "keep at least this many harmonics of whatever note is
    // sounding", so the profile survives transposition. Absent on the nine, on
    // the photo voices and on the bank patches, which are hand-tuned at
    // absolute frequencies and must not move — the golden suite pins them.
    const cutoff = V.cutoffHarm
      ? Math.max(V.cutoff, Math.min(16000, V.cutoffHarm * noteFreq))
      : V.cutoff;

    const lpf = node('createBiquadFilter');
    lpf.type = 'lowpass';
    lpf.frequency.value = cutoff;
    // ── the filter MOVES (v3.65) ──────────────────────────────────────────
    // Until now this was set once and left, so a note's spectrum was frozen
    // for its whole length — no spectral flux whatever. That is the strongest
    // single reason a song voice read as "an electronic synth" rather than an
    // instrument: everything real loses its high partials faster than its
    // fundamental, and a piano's brightness is gone long before its pitch is.
    //
    // `open` is measured, not chosen — the ratio of a cluster's centroid just
    // after a strike to its centroid 140ms later (palette.js, `brightFall`).
    // Above 1 the filter starts wide and closes, which is a plucked string;
    // below 1 it starts narrow and opens, which is a swell, and real records
    // do both (an acoustic track measured 0.63, an electronic one 1.09).
    if (V.open && V.open !== 1) {
      const top = Math.min(16000, Math.max(200, cutoff * V.open));
      // over the strike, not the whole note: the ear reads the first moment
      const fall = Math.max(0.05, Math.min(dur * 0.6, V.dec || dur * 0.4));
      lpf.frequency.setValueAtTime(top, t);
      lpf.frequency.exponentialRampToValueAtTime(cutoff, t + fall);
    }

    const gain = node('createGain');
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + V.atk);
    if (V.decRel) {
      // Strike, then RING. A single exponential to 0.0001 is a fall of 80dB,
      // and it spends almost all of its length inaudible — lengthening it did
      // nothing measurable, the note was still gone by one second. So the
      // strike is a fast fall to a floor, and the floor carries through the
      // rest of the note before releasing. That is the difference between a
      // dot and a struck instrument that is still there when the next one
      // arrives.
      //
      // ── the floor is `decRel`, and until v3.75 it was not (Codex) ────────
      // This branch used the constant DECAY_FLOOR for every voice, and
      // `decRel` was only ever tested for truthiness — so the number each
      // producer computed never reached the ear. Codex verified it in Chrome:
      // decRel 0.35 and 0.85 rendered IDENTICAL audio. Three separate places
      // were carefully deriving a value that did nothing
      // (`voiceFromCluster`'s "ring in proportion to the note", the bank
      // patches, and the stem fit), and this file's own comment already
      // claimed the floor was "the instrument's character, from its analysed
      // decay". Now it is.
      const floor = typeof V.decRel === 'number'
        ? Math.min(0.6, Math.max(0.05, V.decRel))
        : DECAY_FLOOR;
      const knee = t + Math.max(0.06, Math.min(V.dec, dur * 0.4));
      gain.gain.exponentialRampToValueAtTime(peak * floor, knee);
      gain.gain.exponentialRampToValueAtTime(peak * floor * 0.55, t + Math.max(knee - t, dur - 0.08));
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    } else if (V.dec) {
      gain.gain.exponentialRampToValueAtTime(0.0001, t + end);
    } else {
      gain.gain.setValueAtTime(peak, t + Math.max(V.atk, dur - 0.07));
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    }
    lpf.connect(gain).connect(bus);

    const nodes = [];
    const mk = (freq, type = 'sine') => {
      const o = node('createOscillator');
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      return o;
    };
    if (V.partials) {
      // ── partials that live separate lives (v3.79) ─────────────────────────
      // A PeriodicWave is ONE spectrum held for the whole note, so every
      // partial must rise and fall together. Real notes do not: their upper
      // partials die faster than their fundamental, and that motion is most of
      // what tells a struck string from a held one.
      //
      // Measured, not assumed. The v3.78 experiment rendered fourteen notes
      // both ways and Edwin preferred the moving version 8 times, tied 6,
      // never the reverse — six of the eight "not just closer, almost exactly
      // the same as the record". So this is the representation, and the
      // PeriodicWave below stays for every voice that does not carry one.
      //
      // The envelopes are stored on a canonical timeline. Playback keeps the
      // ATTACK in absolute time and stretches only what follows, because a
      // note held four times longer should ring longer rather than be struck
      // four times more slowly.
      const grid = V.partials, T = grid[0].length;
      const srcDur = V.partialsDur || 0.5;
      const atkFrac = Math.min(0.8, Math.max(0, V.partialsPeak ?? 0.1));
      const atkSec = Math.min(dur * 0.5, srcDur * atkFrac);
      const STEPS = 96;
      // played time -> position along the stored timeline, 0..1
      const posAt = u => (u <= atkSec
        ? (atkSec > 0 ? (u / atkSec) * atkFrac : 0)
        : atkFrac + ((u - atkSec) / Math.max(1e-6, dur - atkSec)) * (1 - atkFrac));
      const sample = (row, p) => {
        const x = Math.min(T - 1, Math.max(0, p * (T - 1)));
        const a = Math.floor(x), b = Math.min(T - 1, a + 1);
        return row[a] + (row[b] - row[a]) * (x - a);
      };
      // the shared pitch contour — in cents, so every partial moves by the
      // same ratio and the harmonic relationships hold
      let bend = null;
      if (V.pitchCents?.length > 1) {
        bend = new Float32Array(STEPS);
        for (let i = 0; i < STEPS; i++) {
          bend[i] = Math.pow(2, sample(V.pitchCents, posAt((i / (STEPS - 1)) * dur)) / 1200);
        }
      }
      for (let n = 1; n <= grid.length; n++) {
        const row = grid[n - 1];
        let top = 0;
        for (const v of row) if (v > top) top = v;
        // A partial that never sounds costs an oscillator and contributes
        // nothing; most voices have well under sixteen that clear this.
        if (top < 0.02) continue;
        const hz = noteFreq * n;
        if (hz >= 20000) break;
        const o = node('createOscillator');
        o.type = 'sine';
        o.frequency.setValueAtTime(hz, t);
        if (bend) {
          const f = new Float32Array(STEPS);
          for (let i = 0; i < STEPS; i++) f[i] = hz * bend[i];
          o.frequency.setValueCurveAtTime(f, t, dur);
        }
        const pg = node('createGain');
        const curve = new Float32Array(STEPS);
        for (let i = 0; i < STEPS; i++) curve[i] = Math.max(0, sample(row, posAt((i / (STEPS - 1)) * dur)));
        pg.gain.setValueCurveAtTime(curve, t, dur);
        pg.gain.setValueCurveAtTime(release.curves[n - 1], t + dur, release.duration);
        o.connect(pg).connect(lpf);
        nodes.push(o);
      }
      // ── the residual: what sixteen sines cannot carry (v3.81) ──────────
      // Breath, pick, bow. Measured per note as the share of power OFF the
      // harmonic grid and its centroid; played back as noise through a
      // bandpass at that centroid, at a level that makes the rendered note
      // carry the same share — never a constant. A synth part measures near
      // zero and gets near zero; Edwin's "muffled" vocal measured 4.7%.
      //
      // Level from physics, then verified by rendering and re-measuring
      // (test/audio-cases.js): the partials' power at each step is
      // Σ a²/2; uniform noise in [-1,1) has variance 1/3, and a 2-pole
      // bandpass at fc with Q passes a noise bandwidth of about (π/2)·fc/Q,
      // so the noise's power is that fraction of the Nyquist band.
      // ── the residual, in BANDS, behind a gate (v3.88) ───────────────────
      // v3.81 played the residual as ONE bandpassed noise source at a
      // measured centroid, riding a stepped gain; blind, Edwin flagged it as
      // distortion 4 of 4 and it was switched off (v3.83). The rebuild: the
      // note carries four band envelopes (absolute Hz — breath does not
      // transpose with the note), each already gated by tonality so company
      // never reaches here, and each is played by its own bandpass on one
      // continuous seeded noise source, at the gain that makes the render
      // carry that band's measured share of power against the partials'
      // own power. Attack timing is kept in seconds by the same `posAt`
      // the partials use. The GATE stays off until a blinded pair passes
      // Edwin's ear — flipping it here without that is what the inert test
      // in test/audio-cases.js exists to refuse.
      if (residualPlayback.enabled && V.residualBands?.length === RESIDUAL_BANDS.length) {
        const rows = grid.filter(row => row.some(v => v >= 0.02));
        const tail = residualReleaseCurves(
          release.curves.filter((_, p) => grid[p].some(v => v >= 0.02)),
          V.residualBands.map(row => Math.max(0, sample(row, 1))), ctx.sampleRate);
        const src = node('createBufferSource');
        src.buffer = noiseBuffer();
        src.loop = true;
        let any = false;
        for (let b = 0; b < RESIDUAL_BANDS.length; b++) {
          const band = V.residualBands[b];
          if (!band || !band.some(v => v > 0)) continue;
          const fLo = Math.max(60, RESIDUAL_BANDS[b][0]), fHi = RESIDUAL_BANDS[b][1];
          const fc = Math.sqrt(fLo * fHi), Q = fc / (fHi - fLo);
          // uniform noise in [-1,1) has variance 1/3; a 2-pole bandpass at
          // fc with Q passes a noise bandwidth of about (π/2)·fc/Q
          const bpPower = (1 / 3) * ((Math.PI / 2) * (fc / Q)) / (ctx.sampleRate / 2);
          const curve = new Float32Array(STEPS);
          for (let i = 0; i < STEPS; i++) {
            const p = posAt((i / (STEPS - 1)) * dur);
            let hp = 0;
            for (const row of rows) { const a = sample(row, p); hp += (a * a) / 2; }
            const rb = Math.max(0, sample(band, p));
            let rTot = 0;
            for (const other of V.residualBands) rTot += Math.max(0, sample(other, p));
            rTot = Math.min(0.9, rTot);
            curve[i] = Math.sqrt((hp * rb) / (1 - rTot) / bpPower);
          }
          const bp = node('createBiquadFilter');
          bp.type = 'bandpass';
          bp.frequency.value = fc;
          bp.Q.value = Q;
          const ng = node('createGain');
          ng.gain.setValueCurveAtTime(curve, t, dur);
          ng.gain.setValueCurveAtTime(tail[b], t + dur, release.duration);
          src.connect(bp).connect(ng).connect(lpf);
          any = true;
        }
        if (any) nodes.push(src);
      }
      // The note's own amplitude already lives in the curves above, so the
      // envelope `gain` node must not shape it a second time: hold it flat and
      // let the partials do the work.
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(peak, t);
      // Each partial reaches silence on its continuation, not on the body clock.
      gain.gain.setValueAtTime(peak, t + end);
    } else if (V.kind === 'wave') {
      // the picture's own timbre: harmonic amplitudes derived from its palette
      const o = node('createOscillator');
      o.setPeriodicWave(periodicWave(V.wave));
      o.frequency.setValueAtTime(noteFreq, t);
      o.connect(lpf);
      nodes.push(o);
      // A song's voices used to stop here — one oscillator, every time, which
      // is why four of them measured less distinct than the app's own nine.
      // The three below are what one oscillator cannot do, and a song voice
      // asks for them from what was measured in the record (js/song/palette.js).
      if (V.detune) {
        const o2 = node('createOscillator');
        o2.setPeriodicWave(periodicWave(V.wave));
        o2.frequency.setValueAtTime(noteFreq * V.detune, t);
        const g2 = node('createGain');
        g2.gain.value = 0.55;      // a partner, not a double
        o2.connect(g2).connect(lpf);
        nodes.push(o2);
      }
      if (V.noise) {
        // the stick, the pick, the breath — rides the note's own envelope, so
        // it is an attack and not a layer of hiss
        const src = node('createBufferSource');
        src.buffer = noiseBuffer();
        const bp = node('createBiquadFilter');
        bp.type = 'bandpass';
        bp.frequency.value = Math.min(9000, Math.max(500, cutoff * 1.4));
        bp.Q.value = 0.8;
        const ng = node('createGain');
        const burst = V.dec ? 0.055 : 0.13;   // struck things click, held things breathe
        ng.gain.setValueAtTime(0.0001, t);
        ng.gain.exponentialRampToValueAtTime(V.noise, t + Math.max(0.004, V.atk * 0.4));
        ng.gain.exponentialRampToValueAtTime(0.0001, t + burst);
        src.connect(bp).connect(ng).connect(lpf);
        nodes.push(src);
      }
      if (V.vib) {
        const vo = mk(V.vib[0]);
        const vg = node('createGain');
        vg.gain.value = noteFreq * V.vib[1];
        vo.connect(vg);
        for (const n of nodes) if (n.frequency) vg.connect(n.frequency);
        nodes.push(vo);
      }
    } else if (V.kind === 'tri') {
      const o = mk(ev.freq, 'triangle');
      o.connect(lpf);
      nodes.push(o);
      // struck-string shimmer (the original pluck's octave partial)
      const o2 = mk(ev.freq * 2);
      const g2 = node('createGain');
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.exponentialRampToValueAtTime(peak * 0.28, t + 0.02);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(end, 0.4));
      o2.connect(g2).connect(bus);
      nodes.push(o2);
      voices.push({ osc: o2, gain: g2, until: t + end + 0.1, layer: 'melody' });
    } else if (V.kind === 'square') {
      const o = mk(ev.freq, 'square');
      o.connect(lpf);
      nodes.push(o);
    } else if (V.kind === 'supersaw') {
      // ── the defining sound of pop and dance since the JP-8000 ───────────
      // Seven sawtooth oscillators spread a few cents either side of the note.
      // This is not an imitation of a supersaw: a supersaw IS detuned saws, so
      // for the electronic half of the canon synthesis is ground truth rather
      // than approximation — which is why these patches cost zero download
      // while the acoustic half needs recordings (INSTRUMENT-BANK.md).
      //
      // `spread` in cents, `voices` odd so one sits dead on pitch. The outer
      // pair are quieter: a flat stack sounds like a chorus pedal, a weighted
      // one sounds like one fat instrument.
      const n = V.voices || 7, spread = V.spread ?? 18;
      for (let k = 0; k < n; k++) {
        const off = n === 1 ? 0 : (k / (n - 1) - 0.5) * 2;      // -1..1
        const o = mk(ev.freq * Math.pow(2, off * spread / 1200), 'sawtooth');
        const g = node('createGain');
        g.gain.value = (1 - 0.45 * Math.abs(off)) / n;
        o.connect(g).connect(lpf);
        nodes.push(o);
      }
    } else if (V.kind === 'sub') {
      // ── the 808, which carries the melody in a quarter of all streams ───
      // A sine whose pitch falls into the note (the bridged-T bloop), through
      // a soft saturator for the grit that makes it audible on a phone. The
      // app's own kick already does the pitch-drop half of this; this is the
      // pitched, sustained version that plays a tune.
      const o = mk(ev.freq * (V.drop || 1), 'sine');
      if (V.drop && V.drop !== 1) {
        o.frequency.setValueAtTime(ev.freq * V.drop, t);
        o.frequency.exponentialRampToValueAtTime(ev.freq, t + (V.dropSec || 0.06));
      }
      if (V.drive) {
        const ws = node('createWaveShaper');
        const curve = new Float32Array(512);
        for (let i = 0; i < 512; i++) {
          const x = (i / 255.5 - 1) * V.drive;
          curve[i] = Math.tanh(x) / Math.tanh(V.drive);
        }
        ws.curve = curve;
        o.connect(ws).connect(lpf);
      } else o.connect(lpf);
      nodes.push(o);
    } else if (V.kind === 'detune') {
      for (const m of [1, V.detune]) {
        const o = mk(ev.freq * m, 'triangle');
        const g = node('createGain');
        g.gain.value = 0.5;
        o.connect(g).connect(lpf);
        nodes.push(o);
      }
    } else if (V.kind === 'fm') {
      const carrier = mk(ev.freq);
      const mod = mk(ev.freq * V.ratio);
      const modGain = node('createGain');
      // FM index decays with the envelope — bright strike, mellow tail.
      //
      // CAREFUL, `index` here is NOT the textbook FM index. A modulator wired
      // to `frequency` has its gain in Hz, so this sets peak deviation to
      // `index × the played note`. The real index is deviation ÷ MODULATOR
      // frequency, which makes the true value `index / ratio` — so the same
      // `index` means different amounts of modulation at different ratios.
      // Codex's review caught this: `bell` asks for 0.5 at ratio 2 and gets a
      // true index of 0.25; a patch at ratio 3.51 gets less than a third of
      // what its number suggests.
      //
      // Left as-is rather than corrected, because the nine were hand-tuned BY
      // EAR against this behaviour and golden pins them — changing the maths
      // would silently retune instruments Edwin has already approved. New
      // patches state their intended TRUE index in a comment and set `index`
      // to `trueIndex × ratio`.
      modGain.gain.setValueAtTime(ev.freq * V.index, t);
      modGain.gain.exponentialRampToValueAtTime(ev.freq * 0.02, t + end);
      mod.connect(modGain).connect(carrier.frequency);
      carrier.connect(lpf);
      nodes.push(carrier, mod);
    // Gate on the KIND, not on `buffer`: since v3.71 a sampled voice carries
    // `bank` (nearest recording per note) and no `buffer` at all. Gating on
    // `V.buffer` let a bank-carrying voice fall through to the additive branch
    // below, where `V.h` is undefined and the loop threw — the moment a song's
    // recordings finished downloading, the hum went silent and the preview
    // button died with it. A sample voice with nothing loaded yet returns
    // quietly inside the branch instead.
    } else if (V.kind === 'sample') {
      // ── a recording of the real thing (v3.66, spike) ────────────────────
      // Everything above builds a spectrum and hopes it reads as an
      // instrument. This plays one. A recording already carries the attack
      // transient, the inharmonicity and the spectral decay that synthesis has
      // been failing to fake — and it carries them correctly, because they
      // happened.
      //
      // Nothing here shapes it. `cutoff` sits above hearing for a sample voice
      // unless a song's brightness envelope deliberately asks otherwise, and
      // the gain envelope holds rather than decays (V.dec = 0), so what you
      // hear is the recording's own shape and not ours laid over it.
      //
      // Pitch by playback rate, which also moves the formants — fine within a
      // few semitones, which is why a sample voice needs one recording every
      // few notes rather than one per instrument.
      // A `bank` picks the nearest recording to THIS note; a bare `buffer` is
      // the fixed one. Per-note, because voices are assigned per STROKE while
      // a stroke's notes span pitches — resolving at assignment time would
      // pitch-shift one recording across the whole melody, and playback-rate
      // shifting only stays honest within a couple of semitones.
      let buffer = V.buffer, rootFreq = V.rootFreq;
      if (V.bank?.length) {
        const midi = 69 + 12 * Math.log2(Math.max(1, ev.freq) / 440);
        const near = V.bank.reduce((b, s) => Math.abs(s.midi - midi) < Math.abs(b.midi - midi) ? s : b);
        buffer = near.buf;
        rootFreq = 440 * Math.pow(2, (near.midi - 69) / 12);
      }
      if (!buffer) return;      // still downloading — the caller substitutes
      const src = node('createBufferSource');
      src.buffer = buffer;
      src.playbackRate.value = rootFreq ? ev.freq / rootFreq : 1;
      src.connect(lpf);
      nodes.push(src);
    } else { // 'harm': additive partials
      for (const [mult, amp] of V.h) {
        const o = mk(ev.freq * mult);
        const g = node('createGain');
        g.gain.value = amp / V.h.reduce((a, x) => a + x[1], 0);
        o.connect(g).connect(lpf);
        nodes.push(o);
      }
      if (V.vib) {
        const vo = mk(V.vib[0]);
        const vg = node('createGain');
        vg.gain.value = noteFreq * V.vib[1];
        vo.connect(vg);
        for (const o of nodes) if (o.frequency) vg.connect(o.frequency);
        nodes.push(vo);
      }
    }
    for (const o of nodes) {
      o.start(t);
      o.stop(t + end + 0.05);
    }
    voices.push({ osc: nodes[0], gain, until: t + end + 0.1, layer: 'melody' });
  }

  // ── rhythm layers (mechanics from play_music_theory, reimplemented) ──────
  // beat bitmask: 1 = bass, 2 = drums, 4 = arpeggio. 8 pulses per loop.

  let noiseBuf = null;
  function noiseBuffer() {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      let s = 0x9e3779b9;
      for (let i = 0; i < d.length; i++) {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        d[i] = s / 2 ** 31 - 1;
      }
    }
    return noiseBuf;
  }

  function env(gain, t, peak, dur, attack = 0.002) {
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  // ── the song's own kit ───────────────────────────────────────────────────
  // The rhythm layers were always the app's drums: a 180->48Hz sine for the
  // kick, a noise burst with a 190Hz body for the snare, noise through a 6kHz
  // highpass for the hat. No voice spec ever reached them, so a "song-voiced"
  // hum was the app's drum kit under a song-coloured melody — one of the four
  // traced reasons it did not sound like the record.
  //
  // A kit is a handful of numbers read off the song's percussive clusters. Null
  // means the app's own, so nothing changes until a song asks.
  let kit = null;
  // The record's tone curve: [[hz, dB], …], null for the app's own flat sound.
  // Lives beside the kit because it is the same kind of thing — a handful of
  // numbers read off the record, owned by this synth instance.
  let tone = null;
  const toneNodes = [];
  function applyTone() {
    // RAMPED, not stepped. A kit is read at schedule time, so changing it lands
    // at the next note by construction; a filter node is live, and setting
    // .value would swap the whole record's tone instantly — you would hear the
    // colour change a moment BEFORE the instruments that arrive at the loop
    // seam. 80ms is under a note and long enough not to click.
    const t = ctx.currentTime;
    for (let i = 0; i < toneNodes.length; i++) {
      const band = tone?.[i];
      // No band (or no song) means flat, which is what 0dB on a peaking
      // filter already is — so the app's own sound is untouched by design.
      if (band) toneNodes[i].frequency.setTargetAtTime(band[0], t, 0.02);
      toneNodes[i].gain.setTargetAtTime(band ? band[1] : 0, t, 0.02);
    }
  }
  const kitHatHz = () => kit?.hatHz ?? 6000;
  const kitHatDec = () => kit?.hatDec ?? 0.012;
  const kitSnareHz = () => kit?.snareHz ?? 190;
  const kitSnareDec = () => kit?.snareDec ?? 0.045;
  const kitKickTo = () => kit?.kickTo ?? 48;

  function kickRaw(t, voices, layer) {
    const osc = node('createOscillator');
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(kitKickTo(), t + 0.018);
    const g = node('createGain');
    env(g, t, 0.34, 0.09);
    osc.connect(g).connect(bus);
    osc.start(t); osc.stop(t + 0.12);
    voices.push({ osc, gain: g, until: t + 0.12, layer });
  }

  function snareRaw(t, voices, layer) {
    const src = node('createBufferSource');
    src.buffer = noiseBuffer();
    const g = node('createGain');
    env(g, t, 0.2, kitSnareDec());
    src.connect(g).connect(bus);
    src.start(t, 0.1, 0.06); src.stop(t + 0.06);
    const osc = node('createOscillator');
    osc.type = 'sine';
    osc.frequency.setValueAtTime(kitSnareHz(), t);
    const g2 = node('createGain');
    env(g2, t, 0.15, kitSnareDec());
    osc.connect(g2).connect(bus);
    osc.start(t); osc.stop(t + 0.06);
    voices.push({ osc: src, gain: g, until: t + 0.06, layer }, { osc, gain: g2, until: t + 0.06, layer });
  }

  function hatRaw(t, voices, layer) {
    const src = node('createBufferSource');
    src.buffer = noiseBuffer();
    const hp = node('createBiquadFilter');
    hp.type = 'highpass';
    hp.frequency.value = kitHatHz();
    const g = node('createGain');
    env(g, t, 0.09, kitHatDec());
    src.connect(hp).connect(g).connect(bus);
    src.start(t, 0.2, 0.03); src.stop(t + 0.03);
    voices.push({ osc: src, gain: g, until: t + 0.03, layer });
  }

  // A 65Hz sine is inaudible on a laptop or phone speaker — both roll off long
  // before it — so the old two-partial bass MEASURED loud (94% of its energy
  // below 200Hz) and was heard as nothing. The pitch now rides on harmonics
  // small drivers can actually move: the ear reconstructs the missing
  // fundamental from 2f/3f/4f and hears the same low note. The sub stays for
  // speakers that can play it.
  function bassNoteRaw(t, freq, voices, layer) {
    // A sub nobody can play is just excursion. Edwin, on laptop speakers: "it
    // sounds like it's straining my computer's speakers somehow." Measured, it
    // was — the bass peaked at 0.917 (nearly 3x the melody), carried more energy
    // below 120Hz than any other layer (0.038), and contributed the LEAST above
    // 500Hz where a small driver actually works. The loudest layer in the app,
    // the least audible content in it, and the only one reaching the clipper.
    // Below ~120Hz a laptop driver cannot make sound, but it still tries to
    // move; that movement is the buzz he was hearing.
    const sub = node('createOscillator');
    sub.type = 'sine';
    sub.frequency.setValueAtTime(freq, t);
    const gSub = node('createGain');
    env(gSub, t, 0.07, 0.32, 0.01);   // was 0.18 — headphones still get weight
    sub.connect(gSub).connect(bus);

    // The part anyone on a laptop or phone actually hears — and the part that
    // was buzzing. A sawtooth carries EVERY harmonic at substantial amplitude,
    // so a bandpass wide enough to be audible passed a dense cluster of them:
    // measured partials at 65, 129, 194, 264, 328, 393, 458, 522, 592Hz, nine
    // of them, all 65Hz apart. The critical bandwidth around 400Hz is ~100Hz,
    // so every one of those was beating against its neighbour inside a single
    // critical band. That is the textbook definition of roughness, and it is
    // what Edwin meant by "does not sound clean" — 0.206 on a Sethares
    // dissonance measure against the melody's 0.040 and the arp's 0.016.
    //
    // Fixing the LEVEL could never have fixed this (v3.44 tried, and he still
    // heard it). The cure is fewer partials, spaced wider than a critical
    // band: harmonics 4, 6 and 8 land at 262, 393 and 524Hz for a 65Hz root —
    // 131Hz apart, comfortably outside the ~100Hz band up there, and squarely
    // in the range a small driver actually reproduces. Their 2:3:4 ratio reads
    // as a pitch an octave above the sub, which is a consonant reinforcement
    // rather than a competing one.
    //
    // A PeriodicWave states those three partials exactly, instead of asking a
    // filter to carve them out of a waveform that contains everything. The
    // cache in periodicWave() means one wave is built for the whole session.
    const body = node('createOscillator');
    body.setPeriodicWave(periodicWave([0, 0, 0, 1, 0, 0.55, 0, 0.3]));
    body.frequency.setValueAtTime(freq, t);
    // a gentle roll-off, not a resonant peak: nothing here needs carving
    const lp = node('createBiquadFilter');
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    lp.Q.value = 0.7;
    const gBody = node('createGain');
    // A PeriodicWave is normalised, so it arrives hotter than the filtered
    // sawtooth it replaced — stating three partials wastes none of the signal
    // on harmonics a filter then throws away. The anti-strain gate caught that
    // on the first run, which is exactly what it is for.
    env(gBody, t, 0.33, 0.3, 0.012);
    body.connect(lp).connect(gBody).connect(bus);

    sub.start(t); sub.stop(t + 0.35);
    body.start(t); body.stop(t + 0.35);
    voices.push({ osc: sub, gain: gSub, until: t + 0.35, layer },
                { osc: body, gain: gBody, until: t + 0.35, layer });
  }

  function arpNoteRaw(t, freq, voices, layer) {
    const osc = node('createOscillator');
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    const lpf = node('createBiquadFilter');
    lpf.type = 'lowpass';
    // 0.055/2400Hz was inaudible under melody (~0.18 peak) + drums (kick 0.42)
    // through the master soft-clipper; QA'd against all layers at once.
    lpf.frequency.value = 3400;
    const g = node('createGain');
    env(g, t, 0.17 * loudness(freq), 0.22, 0.008);
    osc.connect(lpf).connect(g).connect(bus);
    osc.start(t); osc.stop(t + 0.26);
    voices.push({ osc, gain: g, until: t + 0.26, layer });
  }

  // A pad: the chord the photo's palette chose, held under everything else.
  // It should read as the floor the melody stands on — present, not competing.
  // v3.33 aimed for that by making it the quietest thing in the mix, which
  // overshot into inaudible even on headphones. Detuned pairs give it width
  // without a chorus effect.
  function padChordRaw(t, freqs, dur, voices, layer) {
    const lpf = node('createBiquadFilter');
    lpf.type = 'lowpass';
    lpf.frequency.value = 2800;
    const g = node('createGain');
    // It swells and eases rather than sitting flat: a quiet, dull, SUSTAINED
    // tone under a bright transient melody is the textbook case for vanishing
    // entirely, and movement is what the ear keeps noticing.
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.036, t + Math.min(0.3, dur * 0.35));
    g.gain.exponentialRampToValueAtTime(0.024, t + dur * 0.75);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    lpf.connect(g).connect(bus);
    for (const f of freqs) {
      for (const detune of [-4, 4]) {
        const osc = node('createOscillator');
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t);
        osc.detune.setValueAtTime(detune, t);
        osc.connect(lpf);
        osc.start(t); osc.stop(t + dur + 0.05);
        voices.push({ osc, gain: g, until: t + dur + 0.05, layer });
      }
    }
  }

  const midiToFreq = m => 440 * Math.pow(2, (m - 69) / 12);

  // after: only pulses at t > after are scheduled (for live layer adds)
  function scheduleRhythm(passStart, beats, secPerBeat, beat, scale, rootMidi, voices, after = -Infinity, chords = null) {
    const pulses = 8;
    const stepPerPulse = beats / pulses;
    const bassFreq = midiToFreq(rootMidi - 12);
    const n = scale.length;
    const arpDegrees = [0, 2, 4, n + 2, 4, 2, 4, n + 4];
    for (let p = 0; p < pulses; p++) {
      const t = passStart + p * stepPerPulse * secPerBeat;
      if (t <= after) continue;
      if (beat & 1) bassNote(t, bassFreq, voices, 'bass');
      if (beat & 2) {
        if (p % 2 === 0) kick(t, voices, 'drums'); else snare(t, voices, 'drums');
        hat(t, voices, 'drums');
        hat(t + stepPerPulse * secPerBeat * 0.5, voices, 'drums');
      }
      if (beat & 4) {
        const d = arpDegrees[p];
        const semi = scale[d % n] + 12 * Math.floor(d / n);
        arpNote(t, midiToFreq(rootMidi + 12 + semi), voices, 'arp');
      }
      // chords: one per two pulses, so the progression breathes across the bar
      if ((beat & 8) && chords?.length && p % 2 === 0) {
        const tri = chords[(p / 2) % chords.length];
        // +12: at rootMidi the triads sat inside the melody's own fundamental
        // range, where they were masked by it, AND in the band small speakers
        // struggle to move at all
        const freqs = tri.map(d => midiToFreq(rootMidi + 12 + scale[d % n] + 12 * Math.floor(d / n)));
        padChord(t, freqs, stepPerPulse * secPerBeat * 2, voices, 'chords');
      }
    }
  }


  function scheduleEvent(ev, t, secPerBeat, voices) {
    track(records => scheduleEventRaw(ev, t, secPerBeat, records), voices, 'melody', t);
  }
  function kick(t, voices, layer) { track(r => kickRaw(t, r, layer), voices, layer, t); }
  function snare(t, voices, layer) { track(r => snareRaw(t, r, layer), voices, layer, t); }
  function hat(t, voices, layer) { track(r => hatRaw(t, r, layer), voices, layer, t); }
  function bassNote(t, freq, voices, layer) { track(r => bassNoteRaw(t, freq, r, layer), voices, layer, t); }
  function padChord(t, freqs, dur, voices, layer) { track(r => padChordRaw(t, freqs, dur, r, layer), voices, layer, t); }
  function arpNote(t, freq, voices, layer) { track(r => arpNoteRaw(t, freq, r, layer), voices, layer, t); }
  buildGraph();
  return {
    scheduleEvent, scheduleRhythm,
    setDrumKit(k) { kit = k || null; },
    setSongTone(t) { tone = t || null; applyTone(); },
    get activeVoiceCount() { return active.size; },
    dispose() {
      for (const group of active) group.stop(ctx.currentTime);
      for (const n of [...graphNodes, ...offlineEnded]) n.disconnect();
      offlineEnded.length = 0;
    },
  };
}
