# training/ — the consented-adapter spike sidecar

_Branch `spike/consented-adapters` · created 2026-09-26 · see `../SPIKE-STACK.md` for what this
is and is not allowed to claim, and `../HANDOFF.md` ledger rows 22–32 for the decisions._

## Layout

| Path | What | Tracked? |
|---|---|---|
| `upstream/stable-audio-3/` | Stability's repo, cloned at **`779434a908193105335fd8d833418603625b2859`** (2026-09-01). The MLX path is `optimized/mlx/`. | **no** — gitignored; re-clone and check out that hash |
| `gate.sh` | The day-1 feasibility gate: one complete local cycle with whole-process memory measured at every step | yes |
| `data/`, `latents/`, `outputs/`, `checkpoints/`, `models/` | audio, latents, generated audio, adapters, weights | **no** — gitignored before anything landed |
| `runs/*.md` | measured results, one file per run, dated | yes |

Weights live in the Hugging Face cache (`~/.cache/huggingface/`) and in
`upstream/stable-audio-3/optimized/mlx/models/`. The `stable-audio-3-optimized` and
`*-base` repos are **not gated** — verified 2026-09-26, anonymous download returns 200.

## The gate (days 1–2, no artist)

Question: does adapter training fit this machine — Apple M4, 16 GB unified memory,
macOS 27 — at a throughput that leaves the 14-day window usable?

1. **Plumbing dataset.** Edwin owns exactly one generated track, so the base model generates
   its own training set: ~24 short instrumental pieces from fixed prompts and seeds, written
   to `data/plumbing/`. Outputs of the base model are owned by the user under the Stability
   AI Community License (as between the user and Stability). This dataset tests plumbing
   **only** — it says nothing about artist-likeness and is reported that way.
2. **Pre-encode** whole files to latents (`pre_encode_mlx.py`, codec `same-s`).
3. **Train briefly** — `sm-music`, `dora-rows`, rank 16, lr 1e-4, a few hundred steps,
   batch 1, checkpoint saved.
4. **Reload and generate** with the adapter, same prompt and seed as a base-only render.
5. **Measure every step**: `/usr/bin/time -l` max RSS, MLX active/peak memory where the
   script reports it, swap before/after (`sysctl vm.swapusage`), seconds per step, seconds
   per generation. Whole process, not one counter — the trainer's own peak counter resets
   after model load.

**Stop rule:** if step 3 swaps heavily, fails to allocate, or projects the three-size ladder
past the window, the gate is **failed** and that is the finding. Nobody has been asked for
files. Report, do not tune.

## Trap: do not use `uv run python` for the scripts

Upstream's README says `uv run python scripts/…`. Its own `./sa3` wrapper does **not** do
that — it execs `.venv/bin/python` directly, and its comment explains why: `uv run` walks up
the tree and picks a stray `.venv` at the repo root, which has no `mlx`. Measured 2026-09-26:
pre-encode failed with `ModuleNotFoundError: No module named 'mlx'` that way. `gate.sh` uses
`$MLX/.venv/bin/python` for every script.

## Conventions inherited from upstream (`TRAINING_CONVENTIONS.md`)

- Pre-encode takes **whole files** up to 600 s, 44.1 kHz stereo (mono is channel-doubled);
  no loudness normalisation. Per file: `<stem>.npy` latents + `<stem>.json` sidecar with
  `seconds_total`, `padding_mask` and **tags**.
- Training crops to a fixed latent length: **1300** (~120 s) for `sm-music`, **4096**
  (~380 s) for `medium`; random crop; short items zero-padded.
- Prompts are built **per sample at train time** from sidecar tags (`Title:/Artist:/Genre:/
  BPM:/Prompt:` …), shuffled or subset for augmentation. A trigger token is optional and
  prepended with 80% probability **if configured** — this spike does not configure one
  (`SPIKE-STACK.md`, "Captions").
- Datasets smaller than the batch are sampled with replacement, ~100 steps/epoch.
- Base weights fp16, adapter fp32; AdamW; no LR schedule by default; seed 42; batch 1;
  checkpoint every 1000 steps plus final.
- The trainer uses the **BASE** (`rectified_flow`) checkpoint, downloaded on first use; the
  shipped ARC weights are inference-only. `sm-music`'s base repo id resolves to
  `stabilityai/stable-audio-3-small-music-base`.
