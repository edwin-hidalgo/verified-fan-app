// The electronic half of the instrument bank — and it costs nothing to ship.
//
// INSTRUMENT-BANK.md measured what hit records are actually made of, over
// 21,299 Billboard tracks: synthesizers reach 70% of 2015-22 hits and
// synthetic drums 83%, against 40% for electric guitar. A bank of piano,
// guitar, violin and flute is not a small bank, it is the wrong bank.
//
// But the electronic half needs no recordings, because for these sounds
// synthesis is not an approximation — it is how they were made in the first
// place. A supersaw IS seven detuned saws. Recording them would be recording
// our own oscillators.
//
// NAMES ARE DELIBERATELY MODEST, after Codex's review. "808" and "DX7 /
// Rhodes" were both overclaims: an 808 bass has a decaying body, not an
// indefinite sustain, and two-operator FM suggests electric keys without
// being either the DX7 factory patch or a Rhodes. A name the product cannot
// cash is a lie it tells, and it gets expensive once a selector maps songs
// onto it. So: "sub bass", not "808"; "FM keys", not "e-piano".
//
// FAMILY vs ROLE are stored separately, also Codex's point: "organ" names an
// instrument family, "pad" names a function, and the selector will need to ask
// those independently — a guitar can play the pad role.
//
// GAINS ARE CALIBRATED, NOT CHOSEN. tools/bank-audition.mjs renders every
// voice playing the same motif and reports what each needs to sit at the bank
// median; a first pass measured a 100x spread (violin 0.004 against the sub's
// 0.44), which would have been heard as "some instruments are broken" the
// moment the app picked four to play together. Re-run it after any change.
//
// These are NOT in `VOICES` (js/audio/synth.js). Those nine are the app's own
// identity, hand-tuned, and pinned by the golden suite; this is a separate
// vocabulary a song can draw on. Same spec shape, so `ev.timbre` carries both.

// DECREL IS NOW THE SUSTAIN FLOOR, and these three were re-valued to 0.22
// when it became one (v3.75). They read 0.5, 0.7 and 0.55 — and every one of
// them rendered at the constant 0.22, because the synth only tested `decRel`
// for truthiness and used DECAY_FLOOR for the level (Codex verified 0.35 and
// 0.85 produce identical audio). So 0.22 is not a change of sound, it is the
// sound these have always made, now written down. The gains above were
// calibrated by ear against it, and `bank-fingerprints.json` was measured
// against it, so both stay valid. Giving a pluck a shorter tail than a sub
// bass is a real idea and a real re-audition; it is not free, and it is not
// smuggled in here.
export const PATCHES = [
  // ── saw-synth family ──────────────────────────────────────────────────
  {
    name: 'supersaw', family: 'saw-synth', role: 'lead',
    kind: 'supersaw', voices: 7, spread: 18,
    cutoff: 4200, atk: 0.02, dec: 0, gain: 0.732,
    // The JP-8000 texture behind most charting pop and EDM since the 90s.
    // Generic name kept deliberately: this is *a* supersaw, not a claim to
    // have recreated that instrument.
  },
  {
    name: 'synth pluck', family: 'saw-synth', role: 'pluck',
    kind: 'supersaw', voices: 5, spread: 12,
    cutoff: 3400, atk: 0.004, dec: 0.5, decRel: 0.22, open: 2.4, gain: 0.85,
    // Named "synth pluck", not "pluck" — it is not trying to be a plucked
    // acoustic instrument, and the bank has real ones that are.
    // `open` is the v3.65 brightness envelope doing a second job: on a synth
    // the filter sweep is the whole character, not a correction.
  },
  {
    name: 'saw pad', family: 'saw-synth', role: 'pad',
    kind: 'supersaw', voices: 7, spread: 26,
    cutoff: 2200, atk: 0.35, dec: 0, gain: 0.96,
    // A pad is as much its release as its attack (Codex). The sustained
    // branch in synth.js holds to the note's length then releases over its
    // last 70ms — audibly a stop, not a tail. Widening that is a synth-wide
    // envelope change touching every sustained voice including the nine, so
    // it is deliberately NOT done here; carried as open in INSTRUMENT-BANK.md.
  },

  // ── bass ──────────────────────────────────────────────────────────────
  {
    name: 'sub bass', family: 'sine-bass', role: 'bass',
    kind: 'sub', drop: 1.3, dropSec: 0.025, drive: 2.4,
    cutoff: 900, atk: 0.004, dec: 1.6, decRel: 0.22, gain: 0.201,
    // 808-INSPIRED, not an 808 — the name was the overclaim Codex flagged
    // hardest. Two things changed with it: the body now DECAYS (the original
    // has a decay control; an indefinite sustain describes nothing real), and
    // the onset pitch drop came down from 1.9x over 50ms — nearly an octave,
    // which reads as a "pew" up the keyboard — to 1.3x over 25ms.
    //
    // Note-on pitch drop is deliberately NOT portamento between notes: gliding
    // from note to note is a performance behaviour, and this plays polyphonic
    // photo-derived melodies where it would smear everything.
  },
  {
    name: 'saw bass', family: 'saw-synth', role: 'bass',
    kind: 'supersaw', voices: 1, spread: 0,
    cutoff: 1100, atk: 0.006, dec: 1.1, decRel: 0.22, open: 3.2, gain: 0.405,
    // The coverage gap Codex named: the bank had several detuned saw textures
    // and a saturated sine, but no plain harmonically-rich bass. One saw
    // through a lowpass with its own filter envelope is a different bass
    // vocabulary entirely from the sub — it has upper harmonics to bite with
    // on a small speaker, where the sine has almost none.
  },

  // ── FM family ─────────────────────────────────────────────────────────
  {
    name: 'FM keys', family: 'fm-keys', role: 'keys',
    kind: 'fm', ratio: 1, index: 1.6,
    cutoff: 3600, atk: 0.006, dec: 1.4, gain: 0.31,
    // Renamed from "e-piano": two-operator FM suggests electric keys without
    // being the DX7 factory patch OR a Rhodes, which are different targets
    // anyway (struck tines and pickups versus an FM interpretation of them).
    // True index is 1.6 here only because ratio is 1 — see the `index` caveat
    // in synth.js. Making this properly electric-piano-like needs a second
    // independently-enveloped component so the bright strike can die while the
    // body rings; that is a real change, not a parameter tweak, and it waits
    // until the name is worth cashing.
  },
  {
    name: 'FM bell', family: 'fm-bell', role: 'bell',
    kind: 'fm', ratio: 3.51, index: 7.72,
    cutoff: 5200, atk: 0.004, dec: 2.0, gain: 0.304,
    // index 7.72 = a TRUE index of 2.2 at ratio 3.51. It read 2.2 before and
    // delivered 0.627, because the engine scales deviation by the carrier
    // rather than the modulator — so the same number meant different
    // modulation at every ratio. Caught by Codex's review; the bell was the
    // patch it hurt most, being furthest from ratio 1.
  },

  // ── organ ─────────────────────────────────────────────────────────────
  {
    name: 'drawbar organ', family: 'organ', role: 'keys',
    kind: 'harm', cutoff: 3800, atk: 0.012, dec: 0, gain: 0.245,
    // Drawbar ratios, NOT integer harmonics of the played note — 16'/8'/5⅓'/
    // 4'/2' is 0.5/1/1.5/2/4, and the 0.5 and 1.5 are the point. Rock, gospel
    // (fastest-growing US genre by volume), R&B, house stabs.
    // Key click, percussion, scanner chorus and the Leslie would all add
    // Hammond character; none is required for this to be an organ, and the
    // rotary speaker in particular is deliberately out of scope.
    h: [[0.5, 0.7], [1, 1], [1.5, 0.35], [2, 0.6], [4, 0.25]],
  },
];

export const PATCH_BY_NAME = Object.fromEntries(PATCHES.map(p => [p.name, p]));
// The selector will ask "what family" and "what role" separately.
export const FAMILIES = [...new Set(PATCHES.map(p => p.family))];
export const ROLES = [...new Set(PATCHES.map(p => p.role))];
