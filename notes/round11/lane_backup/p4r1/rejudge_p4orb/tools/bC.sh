#!/bin/zsh
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/rejudge_p4orb
date
node $W/tools/ftime.mjs --confs lane=5176,main=5197 --cycles 8 --frames 60 --out $W/perf/ftime.json > $W/perf/ftime.out 2>&1
date
