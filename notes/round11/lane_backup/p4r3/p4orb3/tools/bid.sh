#!/bin/zsh
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4orb3
T=$W/tools/b1/identP.mjs; O=$W/ident
PRE='(()=>{const h=window.__hero;h.debug.pose("expand",0);h.debug.settle(0.1);h.debug.pose("expand",2.97);})()'
node $T --port 5173 --tier T1 --out $O/main_T1.json
node $T --port 5176 --tier T1 --qs p4orb3=0 --out $O/lane0_T1.json
node $T --port 5176 --tier T1 --out $O/lane_T1.json
node $T --port 5173 --tier T2 --out $O/main_T2.json
node $T --port 5176 --tier T2 --qs p4orb3=0 --out $O/lane0_T2.json
node $T --port 5173 --tier T1 --pre "$PRE" --out $O/main_T1hold.json
node $T --port 5176 --tier T1 --qs p4orb3=0 --pre "$PRE" --out $O/lane0_T1hold.json
node $T --port 5176 --tier T1 --pre "$PRE" --out $O/lane_T1hold.json
node $T --port 5176 --tier T1 --qs orbhit=0\&orbrim3=0\&shardtop=0 --pre "$PRE" --out $O/lanesub_T1hold.json
