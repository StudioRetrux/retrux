#!/bin/zsh
# Baked environment v9 on macOS (replaces run_bake_m8.ps1): each stage of bake_env_m9.py is one Blender session, run
# through the shared heavy-process slot, time-boxed, and only when macOS reports >= 15 % free memory.
#   run_bake_m9.zsh <outDir> <stage[,stage...]> [k=v ...]       stages: prep maps uv raster light export
# Environment: SRC_BLEND (default: a COPY of blender/plate_scene_v7.blend in the out dir's parent blend/ folder),
#   SLOT (slot.mjs), BLENDER, BATCH (objects per light-bake session, default 8), TIMEBOX (seconds per session, 2100).
# The source .blend is never written: prep saves <out>/prep_scene.blend, uv saves <out>/bake_scene.blend.
set -u
here=${0:A:h}
out=${1:?out dir}
stages=${2:?stages}
shift 2
extra=("$@")
BLENDER=${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}
SLOT=${SLOT:?set SLOT to the shared slot.mjs}
TIMEBOX=${TIMEBOX:-2100}
BATCH=${BATCH:-8}
mkdir -p "$out"
stfile="$out/run_status.txt"
script="$here/bake_env_m9.py"

wait_mem() {
  local n=0
  while true; do
    local free=$(memory_pressure | tail -1 | sed -E 's/.*: ([0-9]+)%.*/\1/')
    if (( free >= 15 )); then return 0; fi
    echo "$(date +%T) memory free ${free}% < 15%: waiting" | tee -a "$stfile"
    sleep 60
    (( n++ ))
    if (( n > 30 )); then echo "memory stayed low" | tee -a "$stfile"; return 1; fi
  done
}

run() {  # run <blend> <tag> [flags...]
  local blend=$1 tag=$2; shift 2
  wait_mem || return 1
  local t0=$(date +%s)
  node "$SLOT" run "env:blender-$tag" -- perl -e 'alarm shift; exec @ARGV' "$TIMEBOX" \
    "$BLENDER" -b "$blend" --python-exit-code 1 --python "$script" -- "$out" "$@" > "$out/$tag.stdout.txt" 2>&1
  local rc=$?
  echo "$(date +%Y-%m-%dT%H:%M:%S) $tag exit $rc $(( $(date +%s) - t0 ))s" | tee -a "$stfile"
  return $rc
}

for st in ${(s:,:)stages}; do
  case $st in
    prep)
      src=${SRC_BLEND:?set SRC_BLEND to a COPY of plate_scene_v7.blend}
      run "$src" prep stage=prep "${extra[@]}" || exit 1 ;;
    maps|uv)
      run "$out/prep_scene.blend" $st stage=$st "${extra[@]}" || exit 1 ;;
    raster|export)
      run "$out/bake_scene.blend" $st stage=$st "${extra[@]}" || exit 1 ;;
    light)
      # Batches of $BATCH objects (one session each keeps memory flat); a batch whose EXRs all exist is skipped.
      objs=(${(f)"$(python3 -c "import json,sys; print('\n'.join(json.load(open('$out/objects.json'))))")"})
      only=""
      for kv in "${extra[@]}"; do [[ $kv == only=* ]] && only=${kv#only=}; done
      [[ -n $only ]] && objs=(${(s:,:)only})
      b=0
      for (( i=1; i<=${#objs}; i+=BATCH )); do
        batch=(${objs[$i,$((i+BATCH-1))]})
        need=0
        for o in $batch; do [[ -f "$out/light/$o.exr" ]] || need=1; done
        if (( need )); then
          rest=(); for kv in "${extra[@]}"; do [[ $kv != only=* ]] && rest+=($kv); done
          run "$out/bake_scene.blend" light_$b stage=light only=${(j:,:)batch} "${rest[@]}" || echo "batch $b failed" | tee -a "$stfile"
        fi
        (( b++ ))
      done ;;
    *) echo "unknown stage $st"; exit 2 ;;
  esac
done
echo "$(date +%Y-%m-%dT%H:%M:%S) DONE $stages" | tee -a "$stfile"
