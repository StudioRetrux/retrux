#!/bin/zsh
# Round-11 QC capture set for the judge panel (pipeline/judge_round11.js), through the shared slot.
#   zsh pipeline/qc_round11.zsh <outDir> [lab=http://localhost:5173] [tier=T1] [scale=1]
# Produces in <outDir>: shoot_qc (all poses + ui: q00..q03, p04..p08, cmp_*, crop_*, log.txt), ptr/ (10 pointer spots),
# sweep/ (glitch sweep + sweep.jpg), region_stats_q00.txt (engine q00 vs ref_F000 region means).
set -e
OUT=${1:?usage: qc_round11.zsh <outDir> [lab] [tier] [scale]}
export LAB=${2:-http://localhost:5173}
TIER=${3:-T1}
SCALE=${4:-1}
MAIN=/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd
V=$MAIN/hero-pipeline/validate
REF=$MAIN/hero-pipeline/reference
SLOTJS=${SLOTJS:-/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/slot/slot.mjs}
mkdir -p $OUT/ptr $OUT/sweep
node $SLOTJS run 'lead:qc' -- node $V/shoot_qc.mjs $OUT $TIER $SCALE
node $SLOTJS run 'lead:ptr' -- node $V/shoot_pointer.mjs $OUT/ptr $TIER $SCALE
node $SLOTJS run 'lead:sweep' -- node $V/shoot_sweep.mjs $OUT/sweep $TIER $SCALE
python3 -I $V/region_stats.py $OUT/q00_rest.png $REF/ref_F000.png > $OUT/region_stats_q00.txt
print "done: $OUT"; ls $OUT | head -60
