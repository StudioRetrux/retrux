#!/bin/zsh
# judge p4orb3 batch B (perf): real-loop interleaved A/B lane :5176 vs :5173, 6 cycles per mode, SLOT_BG=0
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4orb3
date +%T; uptime
node $J/tools/rtx.mjs --vw 1440 --vh 766 --cycles 6 --blockms 2500 --confs lane=5176,main=5173 --out $J/perf/rtx.json > $J/perf/rtx_stdout.json
date +%T; uptime
