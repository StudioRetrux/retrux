#!/bin/zsh
# judge p4orb3 batch C: deterministic paired captures, lane :5176 vs MAIN :5173 (independent of the lane's own switch), T1 + one T2 pose
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4orb3
D=$J/caps/det; mkdir -p $D
date +%T
node $J/tools/jdv.mjs --port 5173 --out $D --tag M --poses q00,q03,p04,p05,p06,p07,p08 --taus 3.3,n
node $J/tools/jdv.mjs --port 5176 --out $D --tag L --poses q00,q03,p04,p05,p06,p07,p08 --taus 3.3,n
node $J/tools/jdv.mjs --port 5173 --out $D --tag M2 --tier T2 --poses p05,p06 --taus 3.3
node $J/tools/jdv.mjs --port 5176 --out $D --tag L2 --tier T2 --poses p05,p06 --taus 3.3
date +%T
