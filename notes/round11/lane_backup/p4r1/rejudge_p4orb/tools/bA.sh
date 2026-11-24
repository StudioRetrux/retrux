#!/bin/zsh
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/rejudge_p4orb
D=$W/caps/det; F=$W/flick
mkdir -p $D $F
date
node $W/tools/rj_det.mjs --port 5176 --tag lane --out $D --taus 3.3,n
node $W/tools/rj_det.mjs --port 5176 --qs p4orb=0 --tag off --out $D --taus 3.3,n
node $W/tools/rj_det.mjs --port 5197 --tag main --out $D --taus 3.3 --poses p05,p06
date
node $W/tools/flick.mjs --port 5176 --mode hold --frames 16 --out $F --tag lane
node $W/tools/flick.mjs --port 5176 --qs p4orb=0 --mode hold --frames 16 --out $F --tag off
node $W/tools/flick.mjs --port 5176 --mode rest --frames 16 --out $F --tag lane
node $W/tools/flick.mjs --port 5176 --qs p4orb=0 --mode rest --frames 16 --out $F --tag off
date
