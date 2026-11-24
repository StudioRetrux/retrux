#!/bin/zsh
# judge perf batch 1 (inside ONE slot): in-session A/B, T1, scale 1
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/perf
node $J/tools/pin.mjs --port 5181 --vw 1440 --vh 766 --path medium --block 60 --cycles 8 --confs full,noC,noB,none --out $J/perf/pin_1440_medium.json > $J/perf/pin_1440_medium.out 2>&1
node $J/tools/pin.mjs --port 5181 --vw 1920 --vh 1080 --path medium --block 60 --cycles 6 --confs full,none --out $J/perf/pin_1920_medium.json > $J/perf/pin_1920_medium.out 2>&1
node $J/tools/pin.mjs --port 5181 --vw 1440 --vh 766 --path fast --block 60 --cycles 6 --confs full,none --out $J/perf/pin_1440_fast.json > $J/perf/pin_1440_fast.out 2>&1
