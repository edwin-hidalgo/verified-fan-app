# Spike stack proposal — for approval

_Written 2026-09-23, revised 2026-09-26 after the Codex review (`CODEX-REVIEW-2026-09-26.md`) · Status: **awaiting Edwin's approval** · Gates: no model code until approved_

> **Sequencing, decided 2026-09-26.** (1) A **two-day feasibility gate first, no artist**: one
> complete local cycle — encode, brief train, save, reload, generate — on audio Edwin owns,
> whole-process memory recorded. If training does not fit this machine, stop; nobody has been
> asked for anything. (2) **Then a bounded, private, paid ask** to one artist Edwin already
> knows: 8–10 tracks, stems if possible, laptop-only, never uploaded, never published, deleted
> after, with the terms written down — that note is the **first real grant record**. (3) The
> **14-day clock starts when the files arrive**, not before. The honorarium moves **inside**
> the budget. FMA is the fallback if nobody says yes, labelled as one.
>
> **What this spike can and cannot establish.** Under Edwin's no-artist-until-it-works rule,
> the result of this window is a **technical feasibility demonstration**: can a per-artist
> adapter be trained locally, routed through a permission check, receipted and revoked, and
> does it sound useful. It **cannot** simultaneously satisfy the original contract's
> *consented-artist* demonstration — that is a separate, later milestone that needs a real
> grant. Recording that scope change openly, as Codex asked.

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

### Licence — reviewed, not cleared; commercial adapter use appears available under conditions

Stable Audio 3 ships under the **Stability AI Community License**. Commercial use is free
below **USD $1M annual revenue**; above it an enterprise licence is required. The licence
states that *"LoRAs, hypernetworks, fine-tunes, retrains, etc, are not 'foundational
models'"* and that *"you own outputs generated from the Core Models or Derivative Works."*
That quotation is from Stability's licensing FAQ, not the agreement text. The agreement
itself adds conditions the FAQ elides: the revenue test counts affiliates and revenue
unrelated to ekos; there are attribution/notice obligations, an acceptable-use policy and
termination provisions; and output ownership is *as between you and Stability* — it clears
nothing against third parties. SA3 also incorporates **T5Gemma under separate Gemma terms**.
Pin the terms for the exact base checkpoint, inference checkpoint and any redistributed
component before the first download.

This clears the concern `EKOS-SPIKE-PLAN.md` raised. It is materially better than
MusicGen, whose non-commercial weights are the trap `ROADMAP.md` §9 flagged, and better
than PiDiNet's research-only licence in the sibling project. Weights are **gated on
Hugging Face** — terms must be accepted before download.

⚠️ The model card describes training data as 1,278,902 recordings from AudioSparx and
Freesound. That is a **vendor provenance account, not evidence that every upstream artist
opted in.** It satisfies "documented base"; it does not make the base "consented."

### Memory — MEASURED 2026-09-26: fits for `sm-music` at matched crop; default crop does not

**Gate result (`training/runs/gate-2026-09-26.md`):** with the latent crop matched to the data
(480 for 45 s files), gradient checkpointing on and `mx.compile` off, `sm-music` / `dora-rows` /
rank 16 / batch 1 trained **300 steps in 399 s (1.27 s/step)** with no OOM, max RSS 1.93 GB,
three 17.6 MB checkpoints, and the reloaded adapter changed a same-seed render (distance 0.892).
The **same run at the default 1300 crop OOMed Metal at step 0** — so the pass is conditional on
crop length, and `medium` remains unmeasured. Projection: ~42 min per 2000-step adapter; the
three-size ladder in ~2–3 h, $0 cash. Re-measure at the crop real songs need before training on
artist material.

For context, the training docs publish figures, **but for the CUDA trainer** — the table below is not a
benchmark of MLX training on a 16 GB M4, and an earlier draft of this document presented it
as one:

| Model | VRAM | With `bf16` + `lora-xs` |
|---|---|---|
| medium | ~6.5 GB | ~5.5 GB |
| small | ~2.5 GB | ~2 GB |

The MLX trainer loads the base in FP16 and does not expose `--base_precision`; its peak
counter resets after model load, so **measure whole-process memory** (process RSS, MLX
memory, swap) across pre-encode → train → save → reload → generate at the intended clip
length, batch size 1 first. Unified memory also serves macOS. It may well fit. "Fits with
headroom" is not a claim this document makes any more.

### The stack

| Choice | Value | Note |
|---|---|---|
| Base | `small-base` first, `medium-base` for quality | Training uses the **BASE** checkpoint (`rectified_flow`), *not* the shipped ARC inference weights |
| Runtime | MLX on the M4 | Apple Silicon only, Python 3.10+. Local so stems never leave the machine |
| Adapter | `dora-rows`, rank **16, held fixed across all three data conditions** | DoRA ≥ LoRA at equal rank. Rank is *not tuned* because the data-floor experiment has one independent variable — how much audio — and moving rank at the same time confounds it. One rank-32 comparison on the full-catalogue condition only, if days remain. `lora-xs` stays available as the memory fallback until memory is measured |
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

- ❌ **Jamendo — rejected as a reputational call.** Jamendo sued Suno in mid-2026 over its
  non-commercial research dataset and **voluntarily dismissed without prejudice on
  2026-08-13** — an earlier draft here said "currently suing", which was stale. The
  dismissal is not a merits ruling in either direction. Sourcing a consent-first demo from
  that catalogue is still a bad look; it is not a legal finding.
- ✅ **Free Music Archive, commercially-usable subset — at full sample rate.** 100k+ CC
  tracks with per-file licences and a published configuration restricted to
  commercially-usable data. ⚠️ A 16 kHz packaging of FMA exists; **do not use it.** SA3
  generates stereo at 44.1 kHz, and training on band-limited audio would teach the adapter
  to produce capped, dull output from a base fully capable of full-rate sound. (An earlier
  draft of this document got this backwards.) ⚠️ **Unresolved until a specific artist and file list exist:** FMA's *metadata* licence is
  distinct from each recording's licence; the small/medium/large packages are 30-second
  excerpts (only `fma_full` is untrimmed); a "commercial-use" filter can still admit
  ShareAlike or NoDerivatives; and these are mixed recordings, not stems. Check exact
  licence versions, attribution, composition vs master rights and third-party samples per
  file. Select **one artist with enough catalogue**
  that the 1 / few / full ladder actually separates, and **enough range** that a negative
  result is about the method rather than the artist — a sparse solo act does not contain
  the variety the adapter is being asked to learn.
- ⚠️ **Edwin's own generated tracks as run zero — only the ones he demonstrably generated.**
  The ekos catalogue is *not* all his: HANDOFF ledger #9 records 29 legacy tracks belonging
  to other World-ID users, and administrative control of the storage bucket is not
  ownership. The SA2.5-via-Replicate outputs are governed by *those* service and model
  terms, not by the SA3 licence quoted above — check them. Even then, permission to use an
  output is not a guarantee of copyright in it. This run tests plumbing, **not** artistic
  quality, and is reported that way.

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

### Captions: content-only, no trigger token — an engineering default, not a doctrine

Captions are half the training signal. Every clip gets a **content description**
(`"warm jazz trio, upright bass, brushed drums, 92 bpm"`) and the artist is not named.

An earlier draft argued this was required by the consent architecture — that a trigger
token would "move invocation into the prompt." **That argument was wrong and is withdrawn**
(Codex review, C.7): it confused *conditioning* with *authorization*. The server can check
the grant, load the adapter, inject a token internally and record the execution; a user
typing a token does not load an adapter that was never loaded. Authorization lives in
whether the worker loads the file, under either captioning scheme. The trainer also freezes
the T5Gemma text encoder and learns adapter weights, so the "all artist information squeezes
through one embedding" claim does not describe this pipeline.

What survives: content-only captions are a reasonable **initial engineering choice** — they
avoid coupling the adapter to a magic word, keep the artist's name out of training text, and
make the adapter's effect testable on ordinary prompts. Neither scheme guarantees
selectivity, freedom from incidental-feature learning, or artist recognition; omitting the
name does not prevent voice imitation. A trigger-token comparison is **optional empirical
work if days remain**, not a test of whether the consent architecture holds.

### The base control

**Generate from the base with the artist's name in the prompt before any adapter exists** —
not because a response would "confound everything" (a matched control lets you measure the
adapter's *incremental* effect regardless), but because you need the baseline to measure
against, and because the observation itself is worth logging. Say which base: the training
**BASE** checkpoint and the deployed **ARC** inference checkpoint are different models. Hold
prompt, seed, duration, sampler, guidance and checkpoint constant; change only the adapter
condition. A behavioural response to a name is **not** proof of training data.

### Prompt matrix

| | content-only prompt | the artist's name | a *different* artist's name |
|---|---|---|---|
| base, no adapter | control | **the control above** | does *any* name do this? |
| 1 song | ✅ | ✅ | — |
| few songs | ✅ | ✅ | — |
| full catalogue | ✅ | ✅ | ✅ |

Two fixed seeds per cell is a floor, not a design: two unanimous forced-choice results have
a **25% chance probability**, and even 16 independent pairs give only ~45% power to detect a
70% preference. The third column cannot establish what *any* name does — one other artist
brings its own genre, familiarity and token effects — so treat name routing as a separate
**policy** test (same content prompt with and without the target name, plus a neutral
invented label) rather than half of the quality experiment. **Commit the prompts and seeds to the repo, dated, before the first
training run** — post-hoc selection of flattering prompts is invisible and irresistible.

### Evaluation

- **Blind, mandatory.** Randomised, labels revealed after. The everything-hums v3.71
  direction change came from a blind test where real recordings beat synthesised voices;
  same discipline here.
- **Define the listening question before listening** — and not as "which is by the same
  artist?", which asserts authorship. Ask which better matches *specified characteristics*
  of held-out references, loudness-matched, with same-genre distractors and real same-artist
  references as controls so the panel is not just recognising instrumentation. Measure
  absolute usefulness separately: an adapter can beat a poor base and still be unusable.
- **The data ladder is exploratory, not a floor-finder.** Nesting (1 ⊂ few ⊂ full) also
  changes repertoire, instrumentation, production and caption coverage; one chosen song may
  be unusually representative or not; equal steps give small sets more repetitions while
  equal epochs give large sets more optimisation. Decide which question is being asked,
  record both training exposure and unique audio minutes, and **hold 1–2 songs out of all
  three conditions**. Three differently sized adapters are not three replications: this can
  identify a promising configuration for one dataset; it cannot locate a minimum, and a
  failure cannot show that a data size is insufficient.
- **Checkpoint selection uses a separate development set.** Eight checkpoints × three
  adapters × eight prompts × two seeds is 384 adapted generations before controls; selecting
  the checkpoint on the final listening material contaminates it. Select on a small dev set,
  freeze, then evaluate untouched prompts, seeds and held-out songs. Keep failed outputs.
- **Baseline the memorization detector on the unmodified base** before judging any adapter;
  "does it regurgitate" is meaningless without knowing what normal similarity looks like.
- **2–3 paid blind listeners**, working musicians. One artist's verdict is n=1; three
  independent blind verdicts turn an anecdote into a finding, cheaply.
- **No bespoke mastering inside the spike.** It is another intervention and more evaluator
  work; loudness-match and compare raw. (It remains a cheap lever for a later product
  question.)
- **The copying detector needs its own validation:** plant a known copied excerpt and a
  transformed copy, include same-genre negatives, search training tracks with local
  alignment, review flagged passages. A detector that misses a planted copy cannot support
  a clean result.

### Budget and clock — to be reconciled before approval

The $100 was sized for GPU time that local training may not need — but "redirect the GPU
money while keeping the full $60 reserve" leaves $40 for everything else, and no listener
fees, evaluation hours or revised totals are specified. Before approval: **one dated 14-day
window** that starts when spike implementation begins (not when an optimizer first runs —
Track A work counts), explicit cash lines (listeners, any data, any fallback GPU), and
measured labour and throughput at the feasibility gate. The artist honorarium belongs to
the later consent-validation milestone, and moving it there moves that outcome there too.

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
   **AB 2602** — read narrowly: it addresses particular personal/professional-services
   provisions for defined voice/likeness replicas, with conditions and an exception, and it
   does not regulate instrumental style resemblance or mandate database fields. Keep the
   pathway toggles and the specific-use text because they make consent *better*, not because
   a schema achieves statutory compliance.
   This is **not** a revival of the licence-terms UI dropped in the July refocus.
2. **Permission check at generation time** — a lookup against the record, never inferred
   by the model. The **denied** path must be demonstrable, not just the authorized one.
3. **Receipt**, append-only, preserving six fields: original request or selection · any
   rewriting applied · resolved artist/song/model · grant plus terms version · **the
   assets actually used** · generation outcome.
4. **Revocation** — **never delete the grant**; that destroys the historical authorization
   record. Retain immutable grant versions, mark revocation with an effective timestamp, and
   deny subsequent use at the worker. Test pristine → adapted → pristine execution, queued
   jobs, concurrent requests, and revocation arriving before output delivery (an adapter
   merged into an in-memory model is not unloaded by deleting its file). State plainly that
   revocation stops ekos-controlled use and cannot recall assets already distributed —
   including a 1 KB palette a browser has already received. Smallness does not make
   revocation stronger. **Do not claim** unknown influence in the base has been erased.

⚠️ **Receipts record what the worker observed** — model and adapter hashes, inference
settings, grant version, outcome, output hash. A receipt documents an execution; it need not
reproduce it bit for bit, and an earlier line here ("a receipt that cannot reproduce itself
is not a receipt") was wrong. The relevant `everything-hums` defect (#64 — `analysePalette`
returns different `flatness` across processes on identical input) still means: store the
spec actually used, never a promise to re-derive it.

⚠️ **Track A's generation engine is a decision, not a given.** Codex recommends building
Track A against a *tiny generation interface* with explicitly labelled test grants and
connecting the real adapter worker when Track B passes — because integrating the
everything-hums palette route adds a second engine, its own asset-licence chain (the
recorded voice bank has rights of its own), the nondeterminism above, and a separate
revocation boundary, without answering whether artist adapters make useful music. And the
iTunes previews it analyses are **not cleared by discarding the audio**: Apple's Search API
terms restrict previews to promotional use and restrict caching. If the palette route is
used at all, use an owned or properly licensed audio fixture. **Pending Edwin's call.**

## Open questions this proposal does NOT answer ❓

- Training memory and wall-clock at the crop length **real songs** need (only 45 s / crop 480 is measured), and for `medium` at all.
- Whether `dora-rows` at rank 16 is right for **music** specifically, as opposed to being
  the repo's general default.
- Whether the medium variant trains on the `optimized/mlx` Apple Silicon path in practice —
  one third-party source says medium "needs a CUDA GPU", which likely describes the
  reference implementation, but it is settled by running it on day 1, not by reading.
- How to caption clips at scale, and how much caption quality moves the result.
- Whether CC-BY training is *reputationally* defensible for a consent-first brand. (Legally,
  Creative Commons says its licences can authorize AI uses subject to their conditions;
  AI-specific consent wording is ekos's *stronger* standard, not a copyright prerequisite.)
- Whether one FMA artist's catalogue is large enough for the "full catalogue" condition.

## What approval means

Approving this authorizes: downloading the gated SA3 weights, standing up the `training/`
sidecar, and running the day-1 feasibility measurement. It does **not** authorize
approaching an artist, uploading anything to a third party, or starting the 14-day clock —
the clock starts at the first training run, and repository maintenance does not start it.

**Stop rule unchanged:** at 14 days or $100, report what was answered and what was not. A
negative result is an acceptable terminating outcome, and a spike that does not terminate
has become the product by accident.
