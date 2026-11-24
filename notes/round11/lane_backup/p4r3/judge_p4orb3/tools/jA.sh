#!/bin/zsh
# judge p4orb3 batch A: ident ?p4orb=0 (lane vs :5173) at T1 + T1 HOLD, ?p4orb3=0 vs :5173 at T1 HOLD
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4orb3
T=$J/tools/identP.mjs; O=$J/ident
PRE='(()=>{const h=window.__hero;h.debug.pose("expand",0);h.debug.settle(0.1);h.debug.pose("expand",2.97);})()'
date +%T
node $T --port 5173 --tier T1 --qs p4orb=0 --out $O/mainP0_T1.json
node $T --port 5176 --tier T1 --qs p4orb=0 --out $O/laneP0_T1.json
date +%T
node $T --port 5173 --tier T1 --qs p4orb=0 --pre "$PRE" --out $O/mainP0_T1hold.json
node $T --port 5176 --tier T1 --qs p4orb=0 --pre "$PRE" --out $O/laneP0_T1hold.json
date +%T
node $T --port 5173 --tier T1 --pre "$PRE" --out $O/main_T1hold.json
node $T --port 5176 --tier T1 --qs p4orb3=0 --pre "$PRE" --out $O/lane0_T1hold.json
node $T --port 5176 --tier T1 --pre "$PRE" --out $O/lane_T1hold.json
date +%T
