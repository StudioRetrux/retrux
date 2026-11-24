#!/bin/zsh
# judge p4orb3 batch H: synchronous frame time, 12 alternations, lane :5176 vs :5173 (tightens the hold ratio)
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4orb3
date +%T; uptime
node $J/tools/ftime.mjs --confs lane=5176,main=5173 --cycles 12 --frames 60 --out $J/perf/ftime2.json > $J/perf/ftime2_stdout.json
date +%T; uptime
