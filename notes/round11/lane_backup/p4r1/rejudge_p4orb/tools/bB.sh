#!/bin/zsh
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/rejudge_p4orb
T=$W/tools/identP.mjs; I=$W/ident
PRE='(()=>{const h=window.__hero;h.debug.pose("expand",0);h.debug.settle(0.1);h.debug.pose("expand",2.97);})()'
date
node $T --port 5176 --tier T1 --qs p4orb=0 --out $I/lane0_T1.json
node $T --port 5197 --tier T1 --out $I/main_T1.json
node $T --port 5176 --tier T2 --qs p4orb=0 --out $I/lane0_T2.json
node $T --port 5197 --tier T2 --out $I/main_T2.json
node $T --port 5176 --tier T1 --qs p4orb=0 --pre "$PRE" --out $I/lane0_T1hold.json
node $T --port 5197 --tier T1 --pre "$PRE" --out $I/main_T1hold.json
node $T --port 5176 --tier T1 --pre "$PRE" --out $I/lane_T1hold.json
node $T --port 5176 --mobile --out $I/lane_T0.json
node $T --port 5197 --mobile --out $I/main_T0.json
node $W/tools/rj_det.mjs --port 5197 --tag main --out $W/caps/det_main --taus 3.3,n
date
