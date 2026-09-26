# Spike stack proposal — for approval

_Written 2026-09-23, revised 2026-09-26 · Status: **awaiting Edwin's approval** · Gates: no model code until approved_

`EKOS-SPIKE-PLAN.md` requires that the concrete stack be approved before any model code
is written. This is that proposal. It also records a change of shape Edwin asked for: the
spike splits into **Track A** (consent architecture, no training) and **Track B** (adapter
proof on real music), with the artist approached only after both work.

Everything below marked ✅ was verified against primary sources on 2026-09-23. Everything
marked ❓ is an open question this proposal does not claim to have answered.

## What changed, and why

Two of Edwin's own observations reshaped this.

**1. We already have a second invocation pathway.** `EKOS-SCOPE-MAP.md` §A1 lists five
licensable pathways — training, **audio conditioning**, voice/likeness, style invocation,
commercial distribution. The spike only ever tested *training*. The song-as-instrument
mechanism in `everything-hums` implements the **audio-conditioning** pathway, and since
its v3.71 it does so in a form remarkably close to this brief's own definition of
invocation — *"architectural routing, not statistical guessing"*: a record's measured
clusters **choose the nearest voice from a bank** rather than synthesising one, because a
blind listening test put real recordings against synthesised voices and the recordings won.

It is worth using because it is measurably cheap and clean: the artifact a record yields
is **~1.06 KB of JSON** (four 233-byte voice specs, a 5-number drum kit, a 5-band tone
curve) extracted from a 2.6 MB excerpt that is then discarded. Nothing is persisted, and
the share link carries nothing about the song. Revocation of a 1 KB artifact is
demonstrable in a way that revocation from a weights file is not.

It is **not** a substitute for the adapter. It lends timbre, kit and tone; it does not
generate in an artist's style. Two pathways, not one cheaper one.

**2. No artist until it works.** Edwin: *"I do not want to approach an artist and waste
their time with a hypothetical build… we need to have this working even if mvp."* So
Track B must demonstrate real music working on legitimately-usable audio **before** any
artist conversation, not as a plumbing rehearsal after one.

## Rejected: 30-second previews as training stems

Edwin asked whether the iTunes preview snippets that `everything-hums` analyses could
serve as the spike's stems. They cannot, for three independent reasons:

1. **The two acts differ.** `everything-hums` *analyses* a preview and discards it —
   ~1 KB of statistics out, audio never leaves the device, only the search term reaches a
   server. Training bakes audio into weights that are then distributed and generated from.
2. **It would falsify the spike's central claim in its first experiment.** The brief's
   invariant: *"'documented' / 'license-permitted' ≠ 'consented.'"* Commercial previews
   are none of the three, and this build is meant to be shown to an artist, to counsel
   and to investors.
3. **It is below the data floor regardless.** The LoRA docs ask for ~20–50 clips minimum.
   One 30-second preview is about one clip.

## Track B — the proposed stack

### Licence ✅ — clear, and better than assumed

Stable Audio 3 ships under the **Stability AI Community License**. Commercial use is free
below **USD $1M annual revenue**; above it an enterprise licence is required. The licence
states that *"LoRAs, hypernetworks, fine-tunes, retrains, etc, are not 'foundational
models'"* and that *"you own outputs generated from the Core Models or Derivative Works."*
The only bar is building a competing foundational model.

This clears the concern `EKOS-SPIKE-PLAN.md` raised. It is materially better than
MusicGen, whose non-commercial weights are the trap `ROADMAP.md` §9 flagged, and better
than PiDiNet's research-only licence in the sibling project. Weights are **gated on
Hugging Face** — terms must be accepted before download.

⚠️ The model card describes training data as 1,278,902 recordings from AudioSparx and
Freesound. That is a **vendor provenance account, not evidence that every upstream artist
opted in.** It satisfies "documented base"; it does not make the base "consented."

### Memory ✅ — fits the 16 GB M4

The plan treated this as an open day-1 risk. The training docs publish figures:

| Model | VRAM | With `bf16` + `lora-xs` |
|---|---|---|
| medium | ~6.5 GB | ~5.5 GB |
| small | ~2.5 GB | ~2 GB |

Both fit a 16 GB unified-memory M4 with headroom. `--base_precision bf16` *"halves the
VRAM used by frozen weights with negligible quality impact."* Still to be **measured**,
not trusted — batch size and sequence length move this.

### The stack

| Choice | Value | Note |
|---|---|---|
| Base | `small-base` first, `medium-base` for quality | Training uses the **BASE** checkpoint (`rectified_flow`), *not* the shipped ARC inference weights |
| Runtime | MLX on the M4 | Apple Silicon only, Python 3.10+. Local so stems never leave the machine |
| Adapter | `dora-rows`, rank **16, held fixed across all three data conditions** | DoRA ≥ LoRA at equal rank. Rank is *not tuned* because the data-floor experiment has one independent variable — how much audio — and moving rank at the same time confounds it. One rank-32 comparison on the full-catalogue condition only, if days remain. Do **not** use `lora-xs`: it trades capacity for memory we do not need |
| Steps | **checkpoint every 250 steps to 2000; select by evaluation** | A step count is a guess; a checkpoint series is a measurement, costs almost nothing, and yields the curve where artist-likeness plateaus and memorization begins — which *is* questions 1 and 5 |
| LR | `1e-4` | The least informative variable; not worth spike days |
| Clip length | **a first-class variable — state it and hold it consistent** | Musical style lives in phrases; likely matters more than rank. Measure memory at batch size 1 before raising it |
| Data | ~20–50 clips minimum at **full sample rate**, each with a matching text description | SA3 is text-conditioned — **captioning is real work, budget for it.** See "Captions" below for what they must and must not say |

**Pipeline:** `pre_encode_mlx.py` (audio → latents + JSON sidecar carrying duration,
padding mask, tags) → `lora_train_mlx.py` → `sa3 --lora <ckpt>.safetensors`. Adapters load
at inference with per-adapter strength 0–10 and **stack**, which matters for multi-artist
routing later.

**Cost:** local training is **$0 cash** — wall-clock and electricity only. The $60 GPU
allowance stays reserved for the Replicate fallback. The $100 ceiling is barely touched
unless local training fails.

### Training audio — the decision that matters

Edwin's requirement: it must work on **real music** before any artist is approached.

- ❌ **Jamendo — rejected.** Jamendo is currently **suing Suno** over AI training on its
  CC-licensed catalogue. Sourcing a consent-first demo from the plaintiff in the defining
  case on this exact question is indefensible whatever the licence text permits.
- ✅ **Free Music Archive, commercially-usable subset — at full sample rate.** 100k+ CC
  tracks with per-file licences and a published configuration restricted to
  commercially-usable data. ⚠️ A 16 kHz packaging of FMA exists; **do not use it.** SA3
  generates stereo at 44.1 kHz, and training on band-limited audio would teach the adapter
  to produce capped, dull output from a base fully capable of full-rate sound. (An earlier
  draft of this document got this backwards.) Select **one artist with enough catalogue**
  that the 1 / few / full ladder actually separates, and **enough range** that a negative
  result is about the method rather than the artist — a sparse solo act does not contain
  the variety the adapter is being asked to learn.
- ✅ **Edwin's own ekos catalogue as run zero.** He owns the Stable Audio 2.5 outputs under
  the licence above, so the first end-to-end run carries zero licensing exposure. This
  tests plumbing, **not** artistic quality — and must be reported that way.

**Framing that must survive into any writeup:** a CC-BY result is a **feasibility and
quality** finding, explicitly **not** a consent demonstration. `EKOS-SPIKE-PLAN.md` §60
already says license-permitted audio *"cannot satisfy the consented-artist
demonstration."* Record every clip's licence and attribution string **before** the first
training step.

### What this then answers

The three-size experiment — one song / a few / the artist's full available catalogue,
three **independently** trained adapters — answers the data floor directly, assessing
song-likeness separately from artist-likeness. One artist cannot establish a universal
minimum, and the writeup must not claim otherwise.

## Experiment design — the parts that decide whether the result means anything

### Captions: describe the music, never name the artist, no trigger token

Captions are half the training signal — the adapter learns to associate their words with
the sound. The common practice for style adapters is a **trigger token**: a rare word in
every caption that the style binds to, which you must then type to get the style. **This
proposal rejects that**, for a reason that is about the thesis rather than about ML.

A trigger token moves invocation into the prompt: whoever types the word invokes the
artist. That is exactly the *"statistical guessing"* this architecture exists to replace.
The brief's requirement is that "can this artist be invoked" is *"answered by a lookup
against a terms record, not inferred by the model."* With **content-only captions**
(`"warm jazz trio, upright bass, brushed drums, 92 bpm"`) the artist's identity lives in the
**grant record** and their sound lives in the **weights** — and the only way to invoke them
through the product is for the server to load their adapter after a permission check. The
architecture enforces the policy instead of depending on it.

What follows from that, dimension by dimension:

| | Trigger token | Content-only (proposed) |
|---|---|---|
| Where control lives | the prompt (user-side) | which adapter is loaded (server-side) |
| What the receipt can claim | "a prompt contained this token" — evidence of a request | "adapter X, hash Y, strength Z was loaded" — a fact about execution |
| Revocation | depends partly on a "secret" word that appears in every log | stop loading the file; there is no word to leak |
| Artist's name in the model | becomes a name-like string; drags in AB 2602 / ELVIS Act territory | never enters training text at all |
| Music: style from small data | all the artist's information squeezes through one embedding; tends to bind to incidental features (room, mastering, one tempo) — *song*-likeness masquerading as *artist*-likeness | shifts the whole distribution; character shows across many prompts, which is what artist-likeness means |
| Music: selectivity | base stays clean for prompts without the token | adapter is always on; managed by per-adapter **strength** (0–10) and by unloading, not by the prompt |
| The data-floor measurement | partly measures "how well did one embedding train" | measures "how much audio until the artist is recognizable" — the actual question |

Honest caveats: style leakage happens either way (the brief already says style selection
is *"the platform's disclosed routing decision, not proof the user intended a particular
artist"*), and this recommendation comes from the requirements rather than from a published
comparison on music adapters. So: **run one trigger-token A/B, same data, full-catalogue
condition only.** One extra run, and the highest-information comparison available.

### The control that must run first

**Generate from the unmodified base model with the artist's name in the prompt, before any
adapter exists.** If the base already leans toward the artist from the name alone, every
adapter result is confounded — "adapter plus whatever the base already knew" would be
credited to the adapter. One afternoon, and it protects every quality claim afterward.
Log the observation carefully: a behavioural response is **not** proof of training data.

### Prompt matrix

| | content-only prompt | the artist's name | a *different* artist's name |
|---|---|---|---|
| base, no adapter | control | **the control above** | does *any* name do this? |
| 1 song | ✅ | ✅ | — |
| few songs | ✅ | ✅ | — |
| full catalogue | ✅ | ✅ | ✅ |

Two fixed seeds per cell. The third column separates "a name did something" from "*this*
name did something." **Commit the prompts and seeds to the repo, dated, before the first
training run** — post-hoc selection of flattering prompts is invisible and irresistible.

### Evaluation

- **Blind, mandatory.** Randomised, labels revealed after. The everything-hums v3.71
  direction change came from a blind test where real recordings beat synthesised voices;
  same discipline here.
- **Define "recognizable" before listening:** reference track, then two candidates, forced
  choice — "which is by the same artist?" A number, not an impression.
- **Nest the data ladder** (1 ⊂ few ⊂ full) so it is a pure quantity ladder, and **hold
  1–2 songs out of all three conditions** so unseen material can separate "sounds like the
  artist" from "replayed the training set."
- **Baseline the memorization detector on the unmodified base** before judging any adapter;
  "does it regurgitate" is meaningless without knowing what normal similarity looks like.
- **2–3 paid blind listeners**, working musicians. One artist's verdict is n=1; three
  independent blind verdicts turn an anecdote into a finding, cheaply.
- **Light mastering of outputs** is a near-free lever on a *perceptual* bar, and probably
  moves "plausibly a product" more than rank 16 vs 32 does. Report raw and mastered
  separately.

### Budget, reshaped

The $100 was sized for GPU time that local training does not need. Redirect: **blind
listeners inside the spike**; an **artist honorarium after it** — the plan assumed
participation without a fee, and paying for their time gets better stems, a more careful
listen, and a relationship rather than a favour. Best dollar in the project. The $60 GPU
line stays as the Replicate fallback reserve.

### Track A ↔ Track B seam

Track A's receipt schema carries **adapter file + hash + strength from day one**, empty
until Track B lands, so nothing is reworked when it does.

## Track A — consent architecture, no training, no artist, ~$0

Buildable now, and it is the half that actually differentiates the product. Terminating
demo, reached without a GPU hour:

> **choose artist → see terms → permission check → generation → receipt → revoke**

1. **Terms record** — the minimal slice of `EKOS-SCOPE-MAP.md` §A7: a grant is
   `grantor × asset × pathway × terms`, with **pathway toggles as separate booleans**
   (`may_train`, `may_condition`, `may_invoke_style`, `may_distribute_commercially`) and a
   human-readable `scope_specificity_text`. Both are legally load-bearing: California
   **AB 2602** voids digital-replica grants lacking a reasonably specific description of
   intended uses, so a blanket grant is not an option.
   This is **not** a revival of the licence-terms UI dropped in the July refocus.
2. **Permission check at generation time** — a lookup against the record, never inferred
   by the model. The **denied** path must be demonstrable, not just the authorized one.
3. **Receipt**, append-only, preserving six fields: original request or selection · any
   rewriting applied · resolved artist/song/model · grant plus terms version · **the
   assets actually used** · generation outcome.
4. **Revocation** — delete the grant, show the record cannot be invoked including cached
   and queued paths, and state what happens to already-generated outputs. **Do not claim**
   unknown influence in the base has been erased.

⚠️ **One concrete engineering constraint.** `everything-hums` carries an open defect (#64):
`analysePalette` is nondeterministic across processes — on bit-identical input a cluster's
`flatness` returns **0.317 or 0.790**, and flatness feeds `noise`, `detune` and `vib`. The
receipt must therefore store **the actual spec that was used**, not a promise it can be
re-derived. A receipt that cannot reproduce itself is not a receipt.

## Open questions this proposal does NOT answer ❓

- Actual measured training memory and wall-clock on this machine under real batch sizes.
- Whether `dora-rows` at rank 16 is right for **music** specifically, as opposed to being
  the repo's general default.
- Whether the medium variant trains on the `optimized/mlx` Apple Silicon path in practice —
  one third-party source says medium "needs a CUDA GPU", which likely describes the
  reference implementation, but it is settled by running it on day 1, not by reading.
- How to caption clips at scale, and how much caption quality moves the result.
- Whether CC-BY training is defensible in practice while Jamendo v. Suno is live.
- Whether one FMA artist's catalogue is large enough for the "full catalogue" condition.

## What approval means

Approving this authorizes: downloading the gated SA3 weights, standing up the `training/`
sidecar, and running the day-1 feasibility measurement. It does **not** authorize
approaching an artist, uploading anything to a third party, or starting the 14-day clock —
the clock starts at the first training run, and repository maintenance does not start it.

**Stop rule unchanged:** at 14 days or $100, report what was answered and what was not. A
negative result is an acceptable terminating outcome, and a spike that does not terminate
has become the product by accident.
