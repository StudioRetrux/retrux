#!/bin/zsh
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5c
cd $W
node tools/rtpin2.mjs --port 5195 --vw 1440 --vh 766 --cycles 8 --blockms 2500 --out perf/rt_1440.json > perf/rt_1440.out 2>&1
node tools/rtpin2.mjs --port 5195 --vw 1920 --vh 1080 --cycles 6 --blockms 2500 --out perf/rt_1920.json > perf/rt_1920.out 2>&1
