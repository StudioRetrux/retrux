#!/bin/zsh
# judge p4orb3 batch E (perf, 2nd try): real-loop interleaved A/B lane :5176 vs :5173, 6 cycles per mode, then synchronous frame time
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4orb3
date +%T; uptime
node $J/tools/rtx.mjs --vw 1440 --vh 766 --cycles 6 --blockms 2500 --confs lane=5176,main=5173 --out $J/perf/rtx2.json > $J/perf/rtx2_stdout.json
date +%T; uptime
node $J/tools/ftime.mjs --confs lane=5176,main=5173 --cycles 8 --frames 60 --out $J/perf/ftime.json > $J/perf/ftime_stdout.json
date +%T; uptime
