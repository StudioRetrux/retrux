#!/bin/zsh
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5c
cd $W
node tools/mb.mjs --port 5195 --path medium --block 40 --cycles 12 --iso 0 --confs noneO,fullO,fullN --out perf/g7_1440_medium.json > perf/g7_1440_medium.out 2>&1
node tools/mb.mjs --port 5195 --path fast --block 40 --cycles 10 --iso 0 --confs noneO,fullO,fullN --out perf/g7_1440_fast.json > perf/g7_1440_fast.out 2>&1
node tools/mb.mjs --port 5195 --path medium --block 40 --cycles 10 --iso 0 --vw 1920 --vh 1080 --confs noneO,fullO,fullN --out perf/g7_1920_medium.json > perf/g7_1920_medium.out 2>&1
node tools/mb.mjs --port 5195 --path fast --block 40 --cycles 8 --iso 0 --vw 1920 --vh 1080 --confs noneO,fullO,fullN --out perf/g7_1920_fast.json > perf/g7_1920_fast.out 2>&1
