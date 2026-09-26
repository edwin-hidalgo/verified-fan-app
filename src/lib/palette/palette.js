// Concept G: a song supplies the INSTRUMENTS, never the melody.
//
// Three earlier song spikes failed for one reason — two melodic voices
// competing for the same job. G concedes the melody entirely: the picture keeps
// writing the tune, and the song decides what it is played on. Nothing is
// replayed and nothing travels but numbers: cutoff frequencies, attack times, a
// harmonic profile. No recording, no stems, no excerpt in a share link.
//
// The open question this exists to answer is whether that survives contact with
// a real record. A finished mix is everything sounding at once, so the honest
// risk is that every track averages out to "medium bright, medium punchy" and a
// folk song and a dance track produce identical instruments.
//
// Pure: takes samples, returns numbers. No DOM, no AudioContext.

const FFT = 2048, HOP = 1024;

// Twiddle factors and the analysis window, each computed ONCE and reused.
// `Math.cos`/`Math.sin` are only "implementation-approximated" in the spec and
// V8 may evaluate them differently across JIT tiers; calling them inside the
// FFT's inner loop made every analysis depend on how warm the code was.
// Hoisting them is not an optimisation, it is one less way for the same record
// to measure differently on two page loads. (It is NOT the whole story — see
// the determinism note in analysePalette.)
const TWIDDLE = new Map();
function twiddles(n) {
  let t = TWIDDLE.get(n);
  if (t) return t;
  t = [];
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1, ang = -2 * Math.PI / len;
    const wr = new Float64Array(half), wi = new Float64Array(half);
    for (let k = 0; k < half; k++) { wr[k] = Math.cos(ang * k); wi[k] = Math.sin(ang * k); }
    t.push({ len, half, wr, wi });
  }
  TWIDDLE.set(n, t);
  return t;
}
// Keyed by length, not a single slot: js/song/stem.js analyses at 4096 while
// this file works at 2048, and a one-slot cache would have rebuilt the window
// on every frame of both. Same values either way — this is speed, not maths.
const WINDOWS = new Map();
export function hann(n) {
  let w = WINDOWS.get(n);
  if (w) return w;
  w = new Float64Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1));
  WINDOWS.set(n, w);
  return w;
}

// Exported for js/song/stem.js, which needs both a spectrum and an
// autocorrelation and must get them from the SAME implementation this file
// uses. Two FFTs in one codebase is two determinism stories, and #64 is
// already one too many.
export function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (const { len, half, wr, wi } of twiddles(n)) {
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < half; k++) {
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + half] * wr[k] - im[i + k + half] * wi[k];
        const vi = re[i + k + half] * wi[k] + im[i + k + half] * wr[k];
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + half] = ur - vr; im[i + k + half] = ui - vi;
      }
    }
  }
}

// Per-frame spectra, plus the running features each frame contributes.
// Exported for js/song/meter.js, which folds the same magnitudes into a chroma
// rather than re-running a second STFT over the excerpt: one pass is ~100ms on
// a laptop and 2-4x that on a phone, against the 400ms main-thread budget
// test/ml-block-test.mjs pins. The `mag` arrays are the 2.6MB, so a caller that
// wants both a palette and a key should pass the same array to both.
export function frames(samples, sampleRate) {
  const win = hann(FFT);
  const out = [];
  let prev = null;
  for (let off = 0; off + FFT <= samples.length; off += HOP) {
    const re = new Float64Array(FFT), im = new Float64Array(FFT);
    for (let i = 0; i < FFT; i++) re[i] = samples[off + i] * win[i];
    fft(re, im);
    const bins = FFT / 2;
    const mag = new Float32Array(bins);
    let energy = 0, weighted = 0, flux = 0;
    for (let k = 1; k < bins; k++) {
      // sqrt(x²+y²), not Math.hypot: hypot is only "implementation-approximated"
      // by the spec, sqrt is exact under IEEE 754.
      const m = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
      mag[k] = m;
      energy += m;
      weighted += m * (k * sampleRate / FFT);
      if (prev) { const d = m - prev[k]; if (d > 0) flux += d; }
    }
    out.push({ t: off / sampleRate, mag, energy, centroid: energy ? weighted / energy : 0, flux });
    prev = mag;
  }
  return out;
}

const pct = (arr, p) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))];
};

// Where the energy sits, as a share of the spectrum. Used both for the wave and
// for judging how vocal-dominated a stretch is: a voice parks most of its power
// in the 200Hz–4kHz formant range and stays there, while percussion and texture
// come and go.
export function bandShares(mag, sampleRate) {
  const hzPerBin = sampleRate / FFT;
  const edges = [0, 120, 400, 1200, 4000, 12000, Infinity];
  const bands = new Array(edges.length - 1).fill(0);
  let total = 0;
  for (let k = 1; k < mag.length; k++) {
    const hz = k * hzPerBin;
    let b = 0;
    while (b < bands.length - 1 && hz >= edges[b + 1]) b++;
    bands[b] += mag[k];
    total += mag[k];
  }
  return total ? bands.map(v => v / total) : bands;
}

// ── the analysis ──────────────────────────────────────────────────────────
// `samples`: mono Float32Array. Returns the raw measurements; turning them into
// a voice spec is a separate step so the numbers can be inspected on their own.
export function analyseExcerpt(samples, sampleRate) {
  const fr = frames(samples, sampleRate);
  if (fr.length < 8) return null;

  const loud = pct(fr.map(f => f.energy), 0.6);
  const voiced = fr.filter(f => f.energy > loud * 0.35);   // ignore near-silence
  const use = voiced.length >= 8 ? voiced : fr;

  // Brightness from the MEDIAN frame, not the mean: a mean is dragged around by
  // a few loud cymbal frames, and what we want is what the track mostly sounds
  // like.
  const centroid = pct(use.map(f => f.centroid), 0.5);

  // Onsets: flux peaks above a percentile floor. Attack is how long energy takes
  // to reach its local peak after one; decay is how long it takes to fall away.
  const fluxes = fr.map(f => f.flux);
  const floor = pct(fluxes, 0.82);
  const onsets = [];
  for (let i = 2; i < fr.length - 2; i++) {
    if (fr[i].flux > floor && fr[i].flux >= fr[i - 1].flux && fr[i].flux > fr[i + 1].flux) onsets.push(i);
  }
  // Attack has to be measured in the TIME domain, not on FFT frames. Measuring
  // it frame by frame quantises it to one hop — every track in the first run
  // came back at exactly 46ms, which is 1024/22050, i.e. the measurement was
  // reporting the hop size rather than the music. An envelope at 128-sample
  // resolution (~6ms) can tell a plucked string from a bowed one.
  const EHOP = 128, EWIN = 512;
  const env = new Float32Array(Math.max(0, Math.floor((samples.length - EWIN) / EHOP)));
  for (let e = 0; e < env.length; e++) {
    let sum = 0;
    const base = e * EHOP;
    for (let i = 0; i < EWIN; i += 2) sum += samples[base + i] * samples[base + i];
    env[e] = Math.sqrt(sum / (EWIN / 2));
  }
  const eSec = EHOP / sampleRate;
  const attacks = [], decays = [];
  const hopSec = HOP / sampleRate;
  for (const i of onsets) {
    const at = Math.floor(i * HOP / EHOP);
    const lo = Math.max(0, at - Math.round(0.03 / eSec));
    const hi = Math.min(env.length - 1, at + Math.round(0.25 / eSec));
    if (hi - lo < 4) continue;
    let peak = lo, peakE = env[lo], floorE = env[lo];
    for (let e = lo; e <= hi; e++) { if (env[e] > peakE) { peakE = env[e]; peak = e; } }
    for (let e = lo; e <= peak; e++) if (env[e] < floorE) floorE = env[e];
    const rise = peakE - floorE;
    if (rise <= 1e-6) continue;
    // 10%→90% of the rise: the standard attack-time window, and it ignores the
    // long shallow tail that a plain "time to peak" measure would include
    let t10 = peak, t90 = peak;
    for (let e = peak; e >= lo; e--) { if (env[e] <= floorE + rise * 0.9) { t90 = e; break; } }
    for (let e = t90; e >= lo; e--) { if (env[e] <= floorE + rise * 0.1) { t10 = e; break; } }
    attacks.push(Math.max(eSec, (t90 - t10) * eSec));
    let j = peak;
    while (j < env.length - 1 && env[j] > peakE / Math.E) j++;
    decays.push((j - peak) * eSec);
  }

  // The harmonic body: the average spectrum of the loudest frames, folded into
  // bins a PeriodicWave can use. This is what gives a track its "colour" beyond
  // brightness alone.
  const top = [...use].sort((a, b) => b.energy - a.energy).slice(0, Math.max(4, Math.round(use.length * 0.2)));
  const avg = new Float32Array(FFT / 2);
  for (const f of top) for (let k = 1; k < avg.length; k++) avg[k] += f.mag[k];
  const shares = bandShares(avg, sampleRate);

  // Harmonic bins for the wave: sample the average spectrum at multiples of a
  // nominal fundamental, so the shape travels rather than the pitch.
  const HARM = 10, base = 110;
  const hzPerBin = sampleRate / FFT;
  const wave = [];
  for (let h = 1; h <= HARM; h++) {
    const k = Math.round(h * base / hzPerBin);
    wave.push(k < avg.length ? avg[k] : 0);
  }
  const wMax = Math.max(...wave) || 1;

  return {
    centroidHz: Math.round(centroid),
    attackMs: Math.round(pct(attacks, 0.5) * 10000) / 10,
    decaySec: Math.round(pct(decays, 0.5) * 100) / 100,
    onsetsPerSec: Math.round(onsets.length / (fr.length * hopSec) * 10) / 10,
    bands: shares.map(v => Math.round(v * 1000) / 1000),
    wave: wave.map(v => Math.round(v / wMax * 1000) / 1000),
    // How much of the energy lives where a voice lives, and how steadily. High
    // and steady is the signature of singing over a backing.
    vocalPull: Math.round((shares[2] + shares[3]) * 1000) / 1000,
  };
}

// Turn the measurements into the same shape photoVoices produces, so the synth
// consumes it through the `ev.timbre` seam with no new plumbing.
export function voiceFromAnalysis(a, name = 'song') {
  if (!a) return null;
  const bright = Math.min(1, Math.max(0, (a.centroidHz - 400) / 3600));
  return {
    name,
    cutoff: Math.round(900 + bright * 4200),
    atk: Math.min(0.4, Math.max(0.006, a.attackMs / 1000)),
    dec: a.decaySec > 0.05 ? Math.min(2.4, a.decaySec) : 0,
    decRel: a.decaySec > 0.05 ? 0.22 : 0,   // the floor it has always rendered at; see synth.js
    gain: Math.round((0.85 + (1 - bright) * 0.3) * 100) / 100,
    kind: 'wave',
    wave: a.wave,
  };
}

// ── one song, several instruments ─────────────────────────────────────────
// A record is not one sound, it is several playing at once — and taking the
// median across the whole excerpt (analyseExcerpt above) literally averages
// them into one blur. That matters more than it first looks: this app's whole
// model is "colours choose the instruments", so a song that yields ONE voice
// would make every stroke in a picture play the same thing and delete the
// mapping that makes the app what it is. A song has to produce a PALETTE.
//
// Stem separation is the obvious route and is out — those models are
// server-class, and `SONG-INTEGRATION-BRAINSTORM.md` §12 parks them explicitly.
// But we do not need to separate the audio. We need the distinct timbres
// PRESENT in it, and instruments separate themselves along axes the FFT above
// already gives us: which band they occupy, and whether they strike or sustain.
// So: cluster the frames rather than average them, and read each cluster as one
// recurring texture. They will not come out labelled "bass" and "hi-hat" — a
// moment where three things sound at once is one blended thing — but the app
// does not want a hi-hat, it wants a palette.

const FEAT = 8;   // [log-centroid, 6 band shares, transientness]

function featureOf(f, sampleRate, fluxNorm) {
  const b = bandShares(f.mag, sampleRate);
  return [
    Math.min(1, Math.log2(Math.max(50, f.centroid) / 50) / 8),
    ...b,
    Math.min(1, f.flux / (fluxNorm || 1)),
  ];
}

// k-means, deterministic: seeded by evenly spaced quantiles of brightness
// rather than at random, so the same song always yields the same palette —
// a hum that changed every time you loaded it would not be the same hum.
function cluster(feats, k, iters = 12) {
  if (feats.length <= k) return feats.map((_, i) => i);
  const order = feats.map((f, i) => [f[0], i]).sort((a, b) => a[0] - b[0]);
  let cents = [];
  for (let c = 0; c < k; c++) {
    cents.push(feats[order[Math.floor((c + 0.5) * order.length / k)][1]].slice());
  }
  const assign = new Int32Array(feats.length);
  for (let it = 0; it < iters; it++) {
    let moved = false;
    for (let i = 0; i < feats.length; i++) {
      let best = 0, bestD = Infinity;
      for (let c = 0; c < k; c++) {
        let d = 0;
        for (let f = 0; f < FEAT; f++) { const x = feats[i][f] - cents[c][f]; d += x * x; }
        if (d < bestD) { bestD = d; best = c; }
      }
      if (assign[i] !== best) { assign[i] = best; moved = true; }
    }
    const sums = Array.from({ length: k }, () => new Float64Array(FEAT));
    const counts = new Int32Array(k);
    for (let i = 0; i < feats.length; i++) {
      counts[assign[i]]++;
      for (let f = 0; f < FEAT; f++) sums[assign[i]][f] += feats[i][f];
    }
    for (let c = 0; c < k; c++) if (counts[c]) for (let f = 0; f < FEAT; f++) cents[c][f] = sums[c][f] / counts[c];
    if (!moved) break;
  }
  return assign;
}

// Aggregate one cluster's frames into the same measurements analyseExcerpt
// produces, so a cluster and a whole song are described in one vocabulary.
// How noise-like a spectrum is: the geometric mean over the arithmetic mean,
// the standard spectral flatness. A pure tone puts all its energy in a few
// bins and scores near 0; a cymbal or a snare spreads it everywhere and scores
// near 1. This is the measurement that tells a struck string from a struck
// drum — and until v3.62 nothing in the analysis could tell them apart,
// because every cluster came out as the same oscillator with a different
// filter on it.
export function flatnessOf(avg, sampleRate, fft) {
  const lo = Math.round(200 * fft / sampleRate), hi = Math.round(8000 * fft / sampleRate);
  let logSum = 0, sum = 0, n = 0;
  for (let k = lo; k < Math.min(hi, avg.length); k++) {
    const v = avg[k] + 1e-9;
    logSum += Math.log(v); sum += v; n++;
  }
  if (!n || sum <= 0) return 0;
  return Math.min(1, Math.exp(logSum / n) / (sum / n));
}

// What makes THIS cluster different from the record as a whole.
//
// The harmonic profile used to be the cluster's own averaged spectrum sampled
// at multiples of a nominal 110Hz — ten fixed frequencies from 108 to 1098Hz,
// the same grid for every cluster in every song. Measured consequence: one
// song's four "instruments" came back 0.951-0.993 cosine-similar. They were
// the same timbre four times, which is why giving them noise and detune
// changed almost nothing — the thing that actually defines the sound was
// identical in all four.
//
// The reason is that a dense mix looks the same in every cluster: the bass and
// the overall spectral tilt dominate whichever frames you pick, so any
// sampling of the raw average comes out alike. Chasing a per-cluster
// fundamental does not help either — in a polyphonic mix there is no single
// fundamental, and a harmonic-product estimate collapses to the bottom of its
// range (measured: 75-129Hz for every cluster of every song tried).
//
// So: divide by the record's own average first. What survives is what this
// texture has MORE of than the song has — which is exactly the thing that
// makes it a different instrument rather than a different filter.
//
// PARTIAL, though — and this is the whole design of it. Dividing all the way
// out removes the record's own spectral tilt, which is the thing that makes
// two DIFFERENT songs sound different from each other. Measured at full
// contrast: one song's internal spread (1.454) overtook the distance between
// two records (1.391), i.e. the palette got vivid and the song stopped being
// recognisable. CONTRAST is the exponent that buys one without spending the
// other; it was swept against both numbers rather than picked.
const CONTRAST = 0.6;

function contrastOf(avg, globalAvg) {
  const out = new Float32Array(avg.length);
  // scale both to the same total so the ratio is about shape, not loudness
  let a = 0, g = 0;
  for (let k = 1; k < avg.length; k++) { a += avg[k]; g += globalAvg[k]; }
  const sa = a || 1, sg = g || 1;
  for (let k = 1; k < avg.length; k++) {
    const mine = avg[k] / sa, all = globalAvg[k] / sg + 1e-7;
    out[k] = mine / Math.pow(all, CONTRAST);
  }
  return out;
}

// Sixteen harmonics of 110Hz rather than ten: the old grid stopped at 1098Hz,
// so cymbals, sibilance and the bite that makes a timbre identifiable were
// never looked at. Sixteen reaches 1.76kHz, and the contrast above carries the
// rest of the character.
function harmonicsOf(spec, sampleRate, fft, count = 16, base = 110) {
  const hzPerBin = sampleRate / fft;
  const out = [];
  for (let h = 1; h <= count; h++) {
    const k = Math.round(h * base / hzPerBin);
    out.push(k < spec.length ? Math.max(0, spec[k]) : 0);
  }
  const max = Math.max(...out) || 1;
  return out.map(v => Math.round(v / max * 1000) / 1000);
}

function describe(fr, idxs, sampleRate, onsetSet, globalAvg) {
  if (!idxs.length) return null;
  const mine = idxs.map(i => fr[i]);
  const centroid = pct(mine.map(f => f.centroid), 0.5);
  const top = [...mine].sort((a, b) => b.energy - a.energy).slice(0, Math.max(3, Math.round(mine.length * 0.3)));
  const avg = new Float32Array(FFT / 2);
  for (const f of top) for (let k = 1; k < avg.length; k++) avg[k] += f.mag[k];
  const shares = bandShares(avg, sampleRate);
  const wave = harmonicsOf(contrastOf(avg, globalAvg), sampleRate, FFT);
  // transientness decides the envelope: a cluster full of onsets strikes and
  // rings out, a cluster with none sustains
  const hits = idxs.filter(i => onsetSet.has(i)).length / idxs.length;
  // ── how fast this texture goes DARK after it is struck (v3.65) ───────────
  // Every measurement above describes one frozen spectrum, and that is most of
  // why a song voice sounds like a synthesiser rather than an instrument: the
  // synth sets its filter once per note and never moves it, so the sound has
  // no spectral flux at all. Real instruments all lose their high partials
  // faster than their fundamental — a piano's brightness is gone long before
  // its pitch is. That fall is the difference between a struck string and a pad.
  //
  // Measured where the app already has the data: the ratio of a frame's
  // centroid three frames after an onset (~140ms at 1024/22050) to its centroid
  // at the onset. Below 1 means it darkens as it rings.
  // Known limitation (Codex's review): `fr[i + 3]` is three frames later in
  // the WHOLE record, not in this cluster — another texture can own that
  // frame, so a strike's measured "decay" is sometimes someone else's onset.
  // The median over all onsets blunts it, and the energy gate below drops the
  // worst cases, but this is a smeared measurement by construction. Not worth
  // sharpening unless the brightness envelope itself survives listening tests
  // (it already lost its role on sampled voices in v3.67).
  const falls = [];
  for (const i of idxs) {
    if (!onsetSet.has(i)) continue;
    const after = fr[i + 3];
    if (!after || !fr[i].centroid || after.energy < fr[i].energy * 0.15) continue;
    falls.push(after.centroid / fr[i].centroid);
  }
  return {
    centroidHz: Math.round(centroid),
    share: idxs.length,
    transient: Math.round(hits * 1000) / 1000,
    // 1 = no measurable fall, which is also what a cluster with no onsets gets:
    // nothing was struck, so nothing was observed to decay.
    brightFall: falls.length >= 3 ? Math.round(pct(falls, 0.5) * 1000) / 1000 : 1,
    flatness: Math.round(flatnessOf(avg, sampleRate, FFT) * 1000) / 1000,
    bands: shares.map(v => Math.round(v * 1000) / 1000),
    wave,
    vocalPull: Math.round((shares[2] + shares[3]) * 1000) / 1000,
  };
}

// A song → several voice specs, ordered dark to bright.
export function analysePalette(samples, sampleRate, { voices = 4 } = {}) {
  const fr = frames(samples, sampleRate);
  if (fr.length < voices * 4) return null;
  const loud = pct(fr.map(f => f.energy), 0.6);
  const keep = [];
  for (let i = 0; i < fr.length; i++) if (fr[i].energy > loud * 0.3) keep.push(i);
  if (keep.length < voices * 4) return null;

  const fluxNorm = pct(fr.map(f => f.flux), 0.9);
  const feats = keep.map(i => featureOf(fr[i], sampleRate, fluxNorm));
  const assign = cluster(feats, voices);

  // onsets, so a cluster knows whether it strikes or sustains
  const floor = pct(fr.map(f => f.flux), 0.82);
  const onsetSet = new Set();
  for (let i = 2; i < fr.length - 2; i++) {
    if (fr[i].flux > floor && fr[i].flux >= fr[i - 1].flux && fr[i].flux > fr[i + 1].flux) onsetSet.add(i);
  }

  // the record as a whole, to measure each texture against
  const globalAvg = new Float32Array(FFT / 2);
  for (const i of keep) for (let k = 1; k < globalAvg.length; k++) globalAvg[k] += fr[i].mag[k];

  const groups = Array.from({ length: voices }, () => []);
  keep.forEach((frameIdx, k) => groups[assign[k]].push(frameIdx));
  const out = groups
    .map(g => describe(fr, g, sampleRate, onsetSet, globalAvg))
    .filter(Boolean)
    .sort((a, b) => a.centroidHz - b.centroidHz);
  return out.length ? out : null;
}

// The kit the record plays, for the rhythm layers.
//
// Cause (d) of four: `scheduleRhythm` always used the app's own drums — a
// 180->48Hz kick, a 190Hz snare body, a 6kHz hat — and no voice spec reached
// them, so turning the beat layers on under a song-voiced melody brought the
// app's drum kit with it.
//
// Nothing here separates stems; it reads the percussive end of what was
// already measured. The brightest struck cluster is where a hat lives, the
// darkest cluster is where a kick lives, and the snare's body sits far below
// its own centroid — a snare reads bright because of the rattle, not the drum.
export function drumKitFrom(clusters) {
  if (!clusters?.length) return null;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const struck = clusters.filter(c => c.transient > 0.25);
  const bright = (struck.length ? struck : clusters).reduce((a, b) => (b.centroidHz > a.centroidHz ? b : a));
  const dark = clusters.reduce((a, b) => (b.centroidHz < a.centroidHz ? b : a));
  const mid = struck.length ? struck[Math.floor(struck.length / 2)] : clusters[Math.floor(clusters.length / 2)];
  return {
    hatHz: Math.round(clamp(bright.centroidHz * 1.4, 2600, 11000)),
    // a noisy cluster rings shorter and crisper; a tonal one lets it wash
    hatDec: Math.round(clamp(0.030 - (bright.flatness ?? 0.5) * 0.022, 0.008, 0.032) * 1000) / 1000,
    snareHz: Math.round(clamp(mid.centroidHz / 9, 110, 340)),
    snareDec: Math.round(clamp(0.030 + (1 - (mid.flatness ?? 0.5)) * 0.045, 0.024, 0.075) * 1000) / 1000,
    // How deep the kick lands follows how much sub the record actually has.
    // The darkest cluster's CENTROID looked like the obvious signal and was
    // not — it sat above 720Hz for most records, so the mapping saturated at
    // its ceiling for three songs out of four. The 0-120Hz share separates
    // them properly: a ballad measures 0.09, a heavy electronic record 0.37.
    kickTo: Math.round(clamp(72 - (dark.bands?.[0] ?? 0.2) * 110, 34, 72)),
  };
}

// The record's own voice, for the melodic layers.
//
// Cause of "every song sounds the same" (v3.64). A voice's `wave` is the only
// field built from contrast-normalised data, and it goes through TWO
// normalisations: `contrastOf` divides the cluster by the record's own average,
// then `harmonicsOf` rescales to max = 1. Between them every absolute fact
// about the record is gone, so what survives is "how this voice deviates from
// its own record" — which is comparable ACROSS records by construction.
// Measured: matching voices of four different records were 1.00x as different
// from each other as two voices inside one record. The record contributed
// nothing. The absolute measurements sitting beside it managed 2.58-5.87x.
//
// It cannot be fixed inside `wave`. Any record-level factor that is constant
// across the harmonics is erased by the max-normalisation, and any factor that
// varies across them is just `CONTRAST` again under another name — which is
// why sweeping that exponent only ever traded one axis for the other.
//
// So the record's character reaches the ear through a different channel, the
// way the drum kit already does: fixed-frequency resonances, one set per
// record, applied to everything it plays. Formants rather than harmonics —
// fixed in Hz regardless of which note is sounding, which is exactly what
// makes a body, a cabinet or a room recognisable across a melody.
//
// Reference is a FIXED profile, deliberately not the record's own average:
// measuring a record against itself is the mistake this exists to undo.
const TONE_HZ = [60, 219, 693, 2191, 6640];        // geometric centres of the bands
// MEASURED over 16 real records (tools/song-sweep.mjs), not guessed. The first
// version of this was estimated from the four local excerpts and was badly off
// — it put band 5 at 0.11 against a real mean of 0.221, so EVERY record came
// back with a +5-6dB top boost and a scooped midrange. That is the same failure
// one level up: a curve every record shares distinguishes none of them.
const TONE_MEAN = [0.141, 0.236, 0.188, 0.214, 0.221];
// ...and how much records actually vary in each band, so a band where they
// differ a lot counts for more than one where they barely differ. Band 3 moves
// by 0.058 across the corpus and band 2 by 0.126: without this, the band that
// carries least would speak as loudly as the band that carries most.
const TONE_SD = [0.071, 0.126, 0.058, 0.076, 0.105];
const TONE_DB_PER_SD = 3.2;
export function songToneFrom(clusters) {
  if (!clusters?.length) return null;
  // Rebuild the record's overall profile by weighting each cluster by how many
  // frames it actually occupies — `share` is that count.
  const acc = new Array(TONE_HZ.length).fill(0);
  let total = 0;
  for (const c of clusters) {
    const w = c.share || 1;
    total += w;
    for (let b = 0; b < acc.length; b++) acc[b] += (c.bands?.[b] ?? 0) * w;
  }
  if (!total) return null;
  // +-7dB: enough to hear, not enough to make a record unlistenable. The low
  // band is held tighter because below ~120Hz a small speaker moves without
  // making sound, and that movement is the buzz v3.44 went and fixed.
  //
  // SOFT, via tanh, not a clamp. A hard limit is how `kickTo` ended up pinned
  // at its ceiling for three records out of four in v3.62 — the moment two
  // records both saturate they stop being distinguishable, which is the exact
  // failure this function exists to fix. tanh keeps the ordering all the way out.
  const lim = (v, i) => {
    const lo = i === 0 ? 5 : 7, hi = i === 0 ? 3 : 7;
    const cap = v < 0 ? lo : hi;
    return cap * Math.tanh(v / cap);
  };
  // Each band in units of how far this record sits from the corpus, measured
  // in corpus standard deviations. Zero-mean by construction, so the curve
  // changes BALANCE and not level — which also keeps it out of the soft
  // clipper's way downstream.
  return TONE_HZ.map((hz, b) => [
    hz,
    Math.round(lim(TONE_DB_PER_SD * (acc[b] / total - TONE_MEAN[b]) / TONE_SD[b], b) * 10) / 10,
  ]);
}

// A cluster is a texture, not a recipe — the envelope comes from whether it
// strikes or sustains, which is the one thing a static spectrum cannot say.
export function voiceFromCluster(c, name) {
  // Linear in Hz, and deliberately so. A log mapping is the obvious correction
  // — brightness is perceived by ratio, and linear-in-Hz does crowd records
  // into the bottom of its range — but measured on eight real records it made
  // things WORSE: between-record distance fell 11.09 to 9.18dB and the ratio
  // 1.32 to 1.07, because log compresses the bright end, and the bright/dark
  // split is where most of the between-record signal actually lives. Kept
  // linear on the measurement, against the argument.
  const bright = Math.min(1, Math.max(0, (c.centroidHz - 300) / 4000));
  const flat = c.flatness ?? 0;
  const held = c.transient <= 0.25;
  return {
    name,
    cutoff: Math.round(800 + bright * 4400),
    atk: c.transient > 0.25 ? 0.008 : Math.round((0.02 + (1 - c.transient) * 0.16) * 1000) / 1000,
    dec: c.transient > 0.25 ? Math.round((0.25 + bright * 0.9) * 100) / 100 : 0,
    // ...and let it ring in proportion to the note, not to a constant. The
    // brighter the cluster the longer it rings, which is a cymbal against a
    // woodblock. `dec` above stays as the floor, so a short note still strikes.
    // Now a LEVEL, not a flag: the share of the peak still sounding after the
    // strike. The old 0.55-0.80 was "ring in proportion to the note" and never
    // reached the synth at all — every value rendered as 0.22. Re-scaled to a
    // range centred on that, so a bright cluster rings a little louder than a
    // dark one and neither is far from what this has always sounded like.
    decRel: c.transient > 0.25 ? Math.round((0.16 + bright * 0.14) * 100) / 100 : 0,
    gain: Math.round((0.8 + (1 - bright) * 0.4) * 100) / 100,
    kind: 'wave',
    wave: c.wave,
    // How far the filter opens at the strike and closes back to `cutoff` over
    // the note — the inverse of the measured brightness fall, so a texture that
    // went dark fast gets a filter that does too. 1 means "no fall was
    // observed" (a cluster with no onsets struck nothing), and the synth then
    // leaves the filter alone, which is exactly what shipped before v3.65.
    open: Math.round(Math.min(2.6, Math.max(0.7, 1 / (c.brightFall || 1))) * 100) / 100,
    // ── three shapes, not one (v3.62) ───────────────────────────────────
    // Every song voice used to be the same instrument: one PeriodicWave into
    // a lowpass, differing only in cutoff and envelope. Measured against the
    // app's own nine — which the suite requires to be > 0.15 apart — one real
    // song's four voices came out 0.086 apart, less distinct than the app
    // allows its own. These three are what a single oscillator cannot do, and
    // each is asked for by a measurement rather than by taste.
    //
    // NOISE: the stick, the pick, the breath. Spectral flatness is what tells
    // a struck string from a struck drum, and nothing used it before — a
    // cymbal cluster measures 0.84 where a solo piano measures 0.006.
    noise: Math.round(Math.min(0.7, Math.max(0, (flat - 0.35) * 1.4)) * 100) / 100,
    // DETUNE: two oscillators a few cents apart beat against each other, which
    // is most of why strings and pads sound alive. For things that sustain and
    // are thick but still tonal — not a pure tone, not noise.
    // ...and how far apart follows how thick the cluster measures, not just how
    // dark it is. Flatness inside the window was previously only a gate: every
    // record that passed it got the same spread for a given brightness.
    detune: held && flat > 0.2 && flat < 0.62
      ? Math.round((1.002 + (1 - bright) * 0.004 + (flat - 0.2) * 0.007) * 1000) / 1000 : 0,
    // VIBRATO: `vocalPull` has been measured since concept G shipped and has
    // never reached the sound. A sustained, mid-flatness cluster with energy
    // in the voice bands is the one thing in a record that actually wavers.
    // The literal `[5.2, 0.005]` this used to return was THE SAME VIBRATO for
    // every record ever analysed — a measurement used only as a gate, never as
    // a value, which is one of the ways four different songs arrived at the
    // same handful of settings. Rate and depth now come from what was measured:
    // a stronger vocal pull wavers wider, a darker cluster wavers slower (big
    // bodies move slower than small ones, which is true of singers and strings
    // alike). Both stay inside the range a human voice actually uses, 4.6-6.4Hz.
    vib: held && c.vocalPull > 0.45 && flat > 0.2 && flat < 0.7
      ? [Math.round((4.6 + bright * 1.8) * 10) / 10,
         Math.round((0.003 + Math.min(0.35, c.vocalPull - 0.45) * 0.017) * 10000) / 10000]
      : null,
  };
}
