# palette/ — the deterministic, in-browser generation engine

Vendored from **everything-hums**, source commit `72c07d59e24530eee219a90fce23f3d38908926e` (v3.89), on
2026-09-26. Nothing here talks to a network and nothing here runs on the server.

## What it does

A local audio file becomes four instrument choices, a drum kit and a tone curve — about **800
bytes of JSON** measured on a real 45-second file — which then voice a note score rendered to a
WAV entirely in the browser. The audio is decoded, measured, and discarded. It is never uploaded.

That property is why this engine is in a consent demo at all: "your file never leaves your
device" is a claim the architecture actually supports, and the receipt stores the 800-byte spec
rather than anything derived from the recording itself.

## Deliberate omissions and changes

| Change | Why |
|---|---|
| **No `searchTracks` / `fetchPreview`** | Upstream can analyse iTunes preview audio. Apple's Search API terms restrict previews to promotional use and restrict caching, and analysing one locally does not clear that. Only `decodeFile` ships, so the input is a file the person already has. |
| **Use `chooseVoices`, never `voiceFromCluster`** | everything-hums open defect #64: `analysePalette` is nondeterministic across processes — a cluster's `flatness` was measured returning either 0.317 or 0.790 on bit-identical input, and it feeds `noise`, `detune` and `vib`. `chooseVoices` reads only `centroidHz`, `bands` and `share`, which were identical on every run. Verified here: the same excerpt yields the same four voices. |
| **`RESIDUAL_BANDS` inlined into `synth.js`** | Importing it pulled in `note.js` → `stem.js`, ~95 KB, for a four-element array read only behind a flag that is off by default. |
| **`bank-fingerprints.json` → `bank-fingerprints.js`** | `with { type: 'json' }` is handled inconsistently across bundlers and this has to survive Next's pipeline. |
| **Patches only — no `assets/samples/`** | Eight of the thirteen voices are synthesised patches: original code, no audio files, no rights surface. `resolveVoice` falls back through `standInFor` to the nearest patch, so the engine works with no sample buffers at all. Verified: `familiesNeeded()` returned `[]` on a real file. |

## If the five sampled voices are ever wanted

They are **CC0-1.0** from three named rights-holders — Versilian (VCSL, VSCO-2-CE) and Karoryfer
— with each source URL and a sha256 of the *unprocessed original* recorded in
`everything-hums/assets/samples/PROVENANCE.md`, and a build that refuses any source whose licence
does not start with CC0. Copy that file alongside the audio if you take them; the credit trail is
the point. ~976 KB for 26 files.

## ⚠️ Licence of the code itself — open item

`everything-hums` has **no LICENSE file and no `license` field**, so its code is
all-rights-reserved to its author. Edwin is that author, so vendoring it here is a formality
rather than a problem — but it should be a formality that has been completed before this demo is
shown to anyone outside. Add a licence upstream (MIT is the obvious choice); this directory then
inherits real provenance instead of an assumption.

## Files

```
source.js              local file -> mono Float32Array at 22050 Hz (decode, toMono, excerpt)
palette.js             analysePalette, drumKitFrom, songToneFrom — pure maths, no DOM
bank.js                chooseVoices, resolveVoice, familiesNeeded — the routing step
bank-fingerprints.js   13 voice fingerprints (8 patch, 5 sample)
patches.js             the 8 synthesised patch definitions
sample-bank.js         SAMPLE_GAIN + the distortion shaper
synth.js               one synthesis implementation, live and offline
wav.js                 renderAudio / encodeWav / renderWav via OfflineAudioContext
```

Browser only: `decodeFile` needs `AudioContext` and `renderAudio` needs
`OfflineAudioContext`. Node has neither — upstream's own server-side renders drive a headless
Chrome for exactly this reason.
