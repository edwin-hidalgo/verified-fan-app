# Spike stack proposal — for approval

_Written 2026-09-23 · Status: **awaiting Edwin's approval** · Gates: no model code until approved_

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
| Adapter | `dora-rows`, rank **16** | The documented default. *An initial candidate, not a proven optimum.* Nine types exist; `lora-xs` is the memory fallback |
| Steps / LR | 1000–2000 @ `1e-4` | Docs' quick-start baseline; *"LoRA behavior varies a lot with dataset size, style, and hardware"* |
| Data | ~20–50 clips minimum, each with a matching text description | SA3 is text-conditioned — **captioning is real work, budget for it** |

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
- ✅ **Free Music Archive, commercially-usable subset.** 100k+ CC tracks with per-file
  licences and a published configuration restricted to commercially-usable data; a 16 kHz
  packaging exists, matching SA3's own sample rate. Select **one artist with enough
  catalogue** to run all three data sizes.
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
- Whether SA3's 16 kHz output is good enough for the "plausibly a product" bar.
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
