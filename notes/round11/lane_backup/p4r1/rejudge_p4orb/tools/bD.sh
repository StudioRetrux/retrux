#!/bin/zsh
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/rejudge_p4orb
date
node $W/tools/rj_det_t.mjs --tier T2 --port 5176 --tag lane --out $W/caps/detT2 --taus 3.3 --poses q00,p05,p06
node $W/tools/rj_det_t.mjs --tier T2 --port 5176 --qs p4orb=0 --tag off --out $W/caps/detT2 --taus 3.3 --poses q00,p05,p06
date
