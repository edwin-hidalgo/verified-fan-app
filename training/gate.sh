#!/usr/bin/env bash
# gate.sh — day-1 feasibility gate for the consented-adapter spike.
#
# One complete local cycle on audio the base model generates itself (owned
# outputs, plumbing only): generate → pre-encode → brief train → reload →
# generate with adapter. Every step runs under /usr/bin/time -l so the record
# is WHOLE-PROCESS max RSS, plus swap before/after and wall-clock. The trainer's
# own peak counter resets after model load and is not trusted on its own.
#
# Usage:  training/gate.sh [step]      steps: dataset | encode | train | infer | all
# Output: training/runs/gate-<date>.md (tracked) + training/data|latents|outputs (ignored)
#
# Stop rule (SPIKE-STACK.md): if `train` swaps heavily, fails to allocate, or
# projects the three-size ladder past the window, the gate is FAILED. Report;
# do not tune.
set -euo pipefail
export PATH="$HOME/.local/bin:$PATH"

T="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MLX="$T/upstream/stable-audio-3/optimized/mlx"
PY="$PY"   # the installer's venv; bare `uv run python` resolved a different env (no mlx) on 2026-09-26
DATA="$T/data/plumbing"; LAT="$T/latents/plumbing"; OUT="$T/outputs/gate"
RUNS="$T/runs"; RUN_NAME="gate-plumbing"
STAMP="$(date +%Y-%m-%d)"; LOG="$RUNS/gate-$STAMP.md"
mkdir -p "$DATA" "$LAT" "$OUT" "$RUNS"

DIT=sm-music; DEC=same-s; RANK=16; LR=1e-4; STEPS=${STEPS:-300}; CKPT_EVERY=100
SECONDS_PER_CLIP=${SECONDS_PER_CLIP:-45}   # sm-music crops to ~120s latents; 45s files pad, that's fine for plumbing

# Fixed prompts + seeds → reproducible plumbing set. Content-only captions, no artist, no trigger token.
PROMPTS=(
 "warm lo-fi hip hop beat, dusty drums, soft electric piano, 85 bpm, instrumental"
 "slow ambient pad, evolving synth texture, no drums, spacious reverb, instrumental"
 "upbeat indie pop, jangly guitars, tight drums, bright, 120 bpm, instrumental"
 "minimal techno loop, deep kick, hi-hat sixteenths, 126 bpm, instrumental"
 "acoustic folk fingerpicking, nylon guitar, gentle, 95 bpm, instrumental"
 "cinematic strings swell, orchestral, slow build, instrumental"
 "jazz trio, upright bass, brushed drums, warm piano, 92 bpm, instrumental"
 "chillwave synth, dreamy chords, soft sidechain, 100 bpm, instrumental"
 "boom bap drums, vinyl crackle, sampled horns, 90 bpm, instrumental"
 "downtempo trip hop, moody bass, sparse drums, 78 bpm, instrumental"
 "house groove, filtered disco chords, four on the floor, 122 bpm, instrumental"
 "piano ballad, solo piano, melancholic, rubato, instrumental"
)
SEEDS=(1 2)

hdr(){ printf "\n## %s — %s\n\n" "$1" "$(date '+%H:%M:%S')" >> "$LOG"; }
swap(){ sysctl -n vm.swapusage | sed 's/(encrypted)//'; }
timed(){ # timed <label> <cmd...> : runs under /usr/bin/time -l, extracts RSS + real, appends to log
  local label="$1"; shift
  local tlog; tlog="$(mktemp)"
  printf -- "- **%s**\n  - swap before: %s\n" "$label" "$(swap)" >> "$LOG"
  local t0=$SECONDS
  if /usr/bin/time -l "$@" > "$tlog" 2>&1; then rc=0; else rc=$?; fi
  local rss real
  rss=$(awk '/maximum resident set size/{printf "%.2f", $1/1073741824}' "$tlog")
  real=$(awk '/[0-9.]+ real/{print $1}' "$tlog")
  printf -- "  - exit %s · wall %ss · **max RSS %s GB**\n  - swap after:  %s\n" "$rc" "${real:-$((SECONDS-t0))}" "${rss:-?}" "$(swap)" >> "$LOG"
  grep -E "peak RAM|realtime|steps/s|it/s|loss|Error|error|Killed" "$tlog" | tail -6 | sed 's/^/  - `/; s/$/`/' >> "$LOG" || true
  cp "$tlog" "$OUT/$label.log"; return $rc
}

step_dataset(){ hdr "1. plumbing dataset (base model generates its own; owned outputs)"
  local n=0
  for i in "${!PROMPTS[@]}"; do for s in "${SEEDS[@]}"; do
    n=$((n+1)); local id; id=$(printf "p%02d-s%d" "$i" "$s"); local f="$DATA/$id.wav"
    [[ -f "$f" ]] && continue
    ( cd "$MLX" && timed "gen-$id" ./sa3 --dit $DIT --decoder $DEC --prompt "${PROMPTS[$i]}" --seconds "$SECONDS_PER_CLIP" --seed "$s" --out "$f" )
    printf '%s' "${PROMPTS[$i]}" > "$DATA/$id.txt"   # .txt sidecar → the `prompt` tag; no artist, no trigger
  done; done
  printf -- "\n%d files × %ss in \`data/plumbing\` (%s)\n" "$n" "$SECONDS_PER_CLIP" "$(du -sh "$DATA" | cut -f1)" >> "$LOG"
}
step_encode(){ hdr "2. pre-encode whole files → latents ($DEC)"
  ( cd "$MLX" && timed "pre-encode" "$PY" scripts/pre_encode_mlx.py --audio-dir "$DATA" --output-dir "$LAT" --codec $DEC --overwrite )
  printf -- "\n%s latent files\n" "$(ls "$LAT"/*.npy 2>/dev/null | wc -l | tr -d ' ')" >> "$LOG"
}
step_train(){ hdr "3. brief train — $DIT · dora-rows · rank $RANK · lr $LR · $STEPS steps · batch 1"
  ( cd "$MLX" && timed "train" "$PY" scripts/lora_train_mlx.py --dit $DIT --latents-dir "$LAT" --lr $LR --name "$RUN_NAME" --adapter-type dora-rows --rank $RANK --max-steps "$STEPS" --checkpoint-every $CKPT_EVERY --save-dir "$T/checkpoints" )
  local ck; ck=$(ls -t "$T"/checkpoints/"$RUN_NAME"/*/checkpoints/*.safetensors 2>/dev/null | head -1 || true)
  printf -- "\ncheckpoint: \`%s\` (%s)\n" "${ck:-NONE}" "$( [[ -n "$ck" ]] && du -h "$ck" | cut -f1 )" >> "$LOG"
}
step_infer(){ hdr "4. reload adapter → generate; same prompt+seed as base-only render"
  local ck; ck=$(ls -t "$T"/checkpoints/"$RUN_NAME"/*/checkpoints/*.safetensors 2>/dev/null | head -1)
  [[ -n "$ck" ]] || { echo "no checkpoint" >> "$LOG"; return 1; }
  local p="${PROMPTS[0]}"
  ( cd "$MLX" && timed "infer-base"    ./sa3 --dit $DIT --decoder $DEC --prompt "$p" --seconds 20 --seed 7 --out "$OUT/base-seed7.wav" )
  ( cd "$MLX" && timed "infer-adapter" ./sa3 --dit $DIT --decoder $DEC --prompt "$p" --seconds 20 --seed 7 --lora "$ck" --lora-strength 1.0 --out "$OUT/adapter-seed7.wav" )
  # do the two renders differ at all? (a sanity check that the adapter is loaded, not a quality claim)
  python3 - "$OUT/base-seed7.wav" "$OUT/adapter-seed7.wav" >> "$LOG" <<'PY'
import sys,wave,array,math
def rd(p):
    w=wave.open(p); n=w.getnframes(); a=array.array('h', w.readframes(n)); w.close(); return a
a,b=rd(sys.argv[1]),rd(sys.argv[2]); n=min(len(a),len(b))
num=sum((a[i]-b[i])**2 for i in range(0,n,50)); den=sum(a[i]**2+b[i]**2 for i in range(0,n,50)) or 1
print(f"\nbase vs adapter rendered-waveform distance (same seed): **{math.sqrt(num/den):.3f}** (0 = identical, adapter had no effect)")
PY
}

{ printf "# Feasibility gate — %s\n\n" "$STAMP"; printf -- "- machine: %s, %s GB, macOS %s\n- upstream: %s\n- python: %s\n- swap at start: %s\n" "$(sysctl -n machdep.cpu.brand_string)" "$(( $(sysctl -n hw.memsize)/1073741824 ))" "$(sw_vers -productVersion)" "$(git -C "$MLX" rev-parse --short HEAD)" "$("$PY" --version)" "$(swap)"; } >> "$LOG"
case "${1:-all}" in
  dataset) step_dataset ;; encode) step_encode ;; train) step_train ;; infer) step_infer ;;
  all) step_dataset; step_encode; step_train; step_infer ;;
  *) echo "usage: gate.sh [dataset|encode|train|infer|all]"; exit 2 ;;
esac
echo "log: $LOG"
