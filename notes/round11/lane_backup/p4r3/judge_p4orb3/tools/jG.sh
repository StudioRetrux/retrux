#!/bin/zsh
# judge p4orb3 batch G: rest-only real-loop A/B (8 interleaved pairs) to re-check the rest ratio seen in rtx2
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4orb3
date +%T; uptime
node $J/tools/rtx.mjs --vw 1440 --vh 766 --cycles 0 --restcycles 8 --holdcycles 0 --blockms 2500 --confs lane=5176,main=5173 --out $J/perf/rtx3_rest.json > $J/perf/rtx3_stdout.json
date +%T; uptime
