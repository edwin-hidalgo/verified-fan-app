// Which voices a song lends, chosen from the bank.
//
// NOT instrument identification. This picks a ROLE — bright or dark, thin or
// full — by finding the bank voice whose own measurements sit nearest the
// song's. "Your song decides whether this is plucked or bowed" is true and
// needs no classifier; "your song contains a guitar" is a claim the published
// ceiling for instrument recognition on real mixes (~0.6 F1) does not support,
// and we do not make it. See INSTRUMENT-BANK.md.
//
// Both sides are measured by the SAME function: a song's clusters come from
// `analysePalette`, and so do the bank's fingerprints (tools/bank-fingerprint
// .mjs renders each voice and runs it through that identical code path). So
// the comparison is like with like rather than two invented feature sets.
import FINGERPRINTS from './bank-fingerprints.js';
import { PATCH_BY_NAME } from './patches.js';
import { SAMPLE_GAIN } from './sample-bank.js';

export const BANK = FINGERPRINTS.voices;

// ── the metric ────────────────────────────────────────────────────────────
// `centroidHz` and `bands` ONLY — deliberately not `flatness` or `transient`.
//
// Those two are exactly what defect #64 destabilises: measured flipping
// 0.317↔0.790 and 0↔0.775 on bit-identical input, while centroid and the band
// shares stayed identical on every run. They are also the two a naive selector
// would reach for first, which is the trap — using them would turn a
// background nondeterminism into audibly different instruments on every page
// load. They join the metric when #64 is fixed, and not before.
//
// ── two populations, aligned before they are compared (v3.72) ─────────────
// v3.71 compared these numbers RAW, and every real record picked the same
// three synth patches — Juanes' acoustic band and Skrillex came out
// identical, and Edwin heard it. The cause was conceptual: a bank voice is
// fingerprinted as ONE isolated note, a song's cluster is a DENSE MIX. A lone
// C4 on a piano has a low centroid; a mastered record with drums, cymbals and
// a vocal has a high one whatever instruments it contains. Measured, the
// populations sit over an octave apart (records average 2093Hz across 76
// clusters of 19 real records; the bank averages 925Hz), so "same analysis
// function" was never "same measuring stick".
//
// So each side is expressed as a z-score against ITS OWN population, and the
// nearest neighbour is found in that aligned space: a cluster that is dark
// for a record picks a voice that is dark for the bank. Record statistics
// come from tools/record-corpus.mjs (real commercial records, numbers
// committed in test/fixtures/real-clusters.json); bank statistics are computed
// from the fingerprints at load.
//
// Centroid in log2 because brightness is perceived by ratio. Bands 1-4 only:
// band 0 is sub-bass, which a mix has (kick, 808) and a single melodic note
// does not (bank SD 0.021), and which says nothing about which melodic voice
// suits the record. Flatness and transient stay out until defect #64 is
// fixed — they are exactly the fields it destabilises.
const RECORD_POP = {   // tools/record-corpus.mjs, 19 records / 76 clusters
  log2Centroid: [11.032, 0.732],
  bands: [[0.218, 0.132], [0.186, 0.087], [0.221, 0.090], [0.243, 0.137]],   // bands 1..4 [mean, sd]
};
const SD_FLOOR = 0.05;   // a narrow band must not dominate on a hair's width
const bankPop = (() => {
  const lc = BANK.map(v => Math.log2(Math.max(50, v.centroidHz)));
  const m = lc.reduce((a, b) => a + b, 0) / lc.length;
  const sd = Math.sqrt(lc.reduce((a, b) => a + (b - m) ** 2, 0) / lc.length);
  const bands = [1, 2, 3, 4].map(i => {
    const xs = BANK.map(v => v.bands?.[i] || 0);
    const bm = xs.reduce((a, b) => a + b, 0) / xs.length;
    return [bm, Math.sqrt(xs.reduce((a, b) => a + (b - bm) ** 2, 0) / xs.length)];
  });
  return { log2Centroid: [m, sd], bands };
})();

const z = (x, [mean, sd]) => (x - mean) / Math.max(SD_FLOOR, sd);

// Weights follow what actually tells an acoustic record from an electronic
// one — measured on eight real records, four a side (median over clusters):
//
//               Es por Ti  Hurt  Sunshine  Hello  | Bangarang  Summer  AtW  party4u
//   band 1        0.205   0.288   0.208   0.201   |   0.141    0.144  0.174  0.169
//   band 4        0.301   0.141   0.213   0.295   |   0.314    0.358  0.406  0.236
//   flatness      0.769   0.485   0.660   0.643   |   0.763    0.852  0.895  0.642
//   transient     0.000   0.042   0.311   0.000   |   0.006    0.000  0.000  0.269
//
// Band 1 — the 120-400Hz body — separates the two sides completely; band 4
// mostly; flatness and transient not at all (Juanes' acoustic band and
// Skrillex measure 0.769 and 0.763). Which also says defect #64, which
// destabilises exactly flatness and transient, is NOT what stands between us
// and this axis. And the aligned centroid, which the first version weighted
// highest, does not separate the sides either. So band 1 carries the most
// weight, band 4 next, centroid least. The same body shows on the bank side:
// the guitars and organ sit at 0.52-0.63 in band 1, supersaw and pluck at
// 0.27-0.29 — so the weighting pulls acoustic records toward the recordings.
const CENTROID_W = 0.25;
const BAND_W = [2.2, 0.5, 0.5, 2.2];   // bands 1..4

// `a` is a song cluster (record population), `b` a bank voice (bank population).
function distance(a, b) {
  const dc = z(Math.log2(Math.max(50, a.centroidHz || 50)), RECORD_POP.log2Centroid)
           - z(Math.log2(Math.max(50, b.centroidHz || 50)), bankPop.log2Centroid);
  let db = 0;
  for (let i = 1; i <= 4; i++) {
    const d = z(a.bands?.[i] || 0, RECORD_POP.bands[i - 1]) - z(b.bands?.[i] || 0, bankPop.bands[i - 1]);
    db += BAND_W[i - 1] * d * d;
  }
  return Math.sqrt(CENTROID_W * dc * dc + db);
}

// ── selection ─────────────────────────────────────────────────────────────
// Independent nearest-match per cluster, and REPEATS ARE ALLOWED: a record
// made of one instrument should be free to return that instrument more than
// once, rather than being forced to invent variety it does not have. Ties
// break by id so two equidistant voices can never flap between page loads.
export function pickVoice(cluster) {
  let best = null, bestD = Infinity;
  for (const v of BANK) {
    const d = distance(cluster, v);
    if (d < bestD - 1e-12 || (Math.abs(d - bestD) <= 1e-12 && best && v.id < best.id)) { bestD = d; best = v; }
  }
  return best;
}

// Repeats are allowed but not preferred. A record made of one instrument
// should be free to return it more than once — but an EXACT repeat means the
// photo's colours have nothing to choose between, and the hum goes
// monotimbral, which is the "one instrument wearing four hats" failure
// audio-cases.js has an assertion against.
//
// Measured on the four local excerpts: a dance track's clusters (centroids
// 2626-3270Hz) all fell nearest the same voice, because the bank's bright end
// is sparse. So a cluster whose nearest is already taken looks for the next
// one — but only if that substitute is nearly as good (within SPREAD_TOL of
// the best distance). Beyond that the repeat is the honest answer, and it
// stands.
const SPREAD_TOL = 1.6;

export function chooseVoices(clusters) {
  const taken = new Set();
  return (clusters || []).map(c => {
    const ranked = BANK.map(v => ({ v, d: distance(c, v) }))
      .sort((a, b) => a.d - b.d || (a.v.id < b.v.id ? -1 : 1));
    if (!ranked.length) return null;
    const free = ranked.find(r => !taken.has(r.v.id) && r.d <= ranked[0].d * SPREAD_TOL);
    const pick = (free || ranked[0]).v;
    taken.add(pick.id);
    return pick;
  });
}

// ── resolving a choice into something the synth can play ──────────────────
// A patch is ready immediately and costs no download. A sampled voice needs
// its recording, so until that arrives it plays as its nearest PATCH — the hum
// never waits on the network, and the substitution is by the same metric that
// made the choice, so it is the closest thing the bank can offer for free.
// Bank-to-bank, so BOTH sides are the bank population — `distance` above
// assumes a record on the left, and feeding it two voices would z-score one of
// them against the wrong world.
function bankDistance(a, b) {
  const dc = z(Math.log2(Math.max(50, a.centroidHz || 50)), bankPop.log2Centroid)
           - z(Math.log2(Math.max(50, b.centroidHz || 50)), bankPop.log2Centroid);
  let db = 0;
  for (let i = 1; i <= 4; i++) {
    const d = z(a.bands?.[i] || 0, bankPop.bands[i - 1]) - z(b.bands?.[i] || 0, bankPop.bands[i - 1]);
    db += BAND_W[i - 1] * d * d;
  }
  return Math.sqrt(CENTROID_W * dc * dc + db);
}
const PATCHES_ONLY = BANK.filter(v => v.source === 'patch');
const NEAREST_PATCH = Object.fromEntries(BANK.map(v => {
  let best = null, bestD = Infinity;
  for (const p of PATCHES_ONLY) {
    const d = bankDistance(v, p);
    if (d < bestD - 1e-12 || (Math.abs(d - bestD) <= 1e-12 && best && p.id < best.id)) { bestD = d; best = p; }
  }
  return [v.id, best?.id];
}));

export const standInFor = id => PATCH_BY_NAME[NEAREST_PATCH[id]] || PATCH_BY_NAME['saw pad'];

// `buffers` maps family → { midi, buf } list, filled in as samples arrive.
// Returns a voice spec ready for `ev.timbre`.
export function resolveVoice(choice, buffers) {
  if (!choice) return PATCH_BY_NAME['saw pad'];
  if (choice.source === 'patch') return PATCH_BY_NAME[choice.id] || standInFor(choice.id);
  const bank = buffers?.[choice.family];
  if (!bank?.length) return standInFor(choice.id);
  // The whole bank travels on the spec; the synth picks the nearest recording
  // per NOTE, because one stroke's notes span pitches and playback-rate
  // shifting only stays honest within a couple of semitones.
  return {
    name: choice.family, kind: 'sample', bank,
    cutoff: 20000, atk: 0.003, dec: 0, decRel: 0,
    gain: SAMPLE_GAIN[choice.family] ?? 1,
  };
}

// Which sample families a selection needs, so only those are fetched.
export const familiesNeeded = choices =>
  [...new Set((choices || []).filter(c => c?.source === 'sample').map(c => c.family))];
