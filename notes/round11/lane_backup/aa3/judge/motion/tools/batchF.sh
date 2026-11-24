#!/bin/zsh
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/motion
node $J/tools/rl.mjs --port 5182 --out $J/rl/base_slow --path slow --frames 180
node $J/tools/rl.mjs --port 5181 --out $J/rl/aa3_slow --path slow --frames 180
node $J/tools/rl.mjs --port 5182 --out $J/rl/base_medium --path medium --frames 180
node $J/tools/rl.mjs --port 5181 --out $J/rl/aa3_medium --path medium --frames 180
$J/tools/batch.sh aa3nt_medium:5181:medium:--qs,lktaa=0
