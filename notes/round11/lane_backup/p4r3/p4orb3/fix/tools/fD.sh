#!/bin/zsh
# F2 fixer: the judge's batch C (jC.sh) on the fixed build: fresh page per tag, M = :5173, L = :5176, T1 all poses + T2 p05/p06
F=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4orb3/fix; D=$F/caps/det; mkdir -p $D
date +%T
node $F/tools/jdv.mjs --port 5173 --out $D --tag M --poses q00,q03,p04,p05,p06,p07,p08 --taus 3.3,n
node $F/tools/jdv.mjs --port 5176 --out $D --tag L --poses q00,q03,p04,p05,p06,p07,p08 --taus 3.3,n
node $F/tools/jdv.mjs --port 5173 --out $D --tag M2 --tier T2 --poses p05,p06 --taus 3.3
node $F/tools/jdv.mjs --port 5176 --out $D --tag L2 --tier T2 --poses p05,p06 --taus 3.3
date +%T
