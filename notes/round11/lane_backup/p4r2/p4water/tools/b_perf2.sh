#!/bin/zsh
# p4water perf A/B vs :5199 (MAIN = aa8), run $1: product loop T1 scale 1, interleaved AB/BA, MOVE / REST / HOLD, 8 pairs each
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
W=$SP/work_p4/p4water
SLOT_BG=0 node $SP/slot/slot.mjs run "p4water:perf$1" -- node $W/tools/rc2h.mjs --vw 1440 --vh 766 --cycles 8 --restcycles 8 --holdcycles 8 --blockms 2500 --confs "lane=5177|tier=T1&scale=1,main=5199|tier=T1&scale=1" --out $W/perf/ab_run$1.json > $W/logs/perf$1.log 2>&1
echo "perf exit $?" >> $W/logs/perf$1.log
