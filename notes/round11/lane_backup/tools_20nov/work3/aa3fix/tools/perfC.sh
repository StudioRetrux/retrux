#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; F=$SP/work3/aa3fix
for r in 1 2; do
node $SP/work3/judge/perf/tools/pin.mjs --port 5181 --vw 1440 --vh 766 --path medium --block 60 --cycles 8 --confs noB,none --qs "lktaafar=2" --out $F/perf/pinC_far2_$r.json > /dev/null 2>&1
node $SP/work3/judge/perf/tools/pin.mjs --port 5181 --vw 1440 --vh 766 --path medium --block 60 --cycles 8 --confs noB,none --out $F/perf/pinC_far3_$r.json > /dev/null 2>&1
done
