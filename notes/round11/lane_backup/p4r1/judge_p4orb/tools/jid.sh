#!/bin/zsh
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4orb
T=$J/tools/identP.mjs
PRE='(()=>{const h=window.__hero;h.debug.pose("expand",0);h.debug.settle(0.1);h.debug.pose("expand",2.97);})()'
node $T --port 5176 --tier T1 --qs p4orb=0 --out $J/ident/lane0_T1.json
node $T --port 5197 --tier T1 --out $J/ident/main_T1.json
node $T --port 5176 --tier T2 --qs p4orb=0 --out $J/ident/lane0_T2.json
node $T --port 5197 --tier T2 --out $J/ident/main_T2.json
node $T --port 5176 --tier T1 --qs p4orb=0 --pre "$PRE" --out $J/ident/lane0_T1hold.json
node $T --port 5197 --tier T1 --pre "$PRE" --out $J/ident/main_T1hold.json
node $T --port 5176 --tier T1 --pre "$PRE" --out $J/ident/lane_T1hold.json
cd $J/ident
node $J/tools/identcmp.mjs lane0_T1.json main_T1.json "p4orb=0 T1 vs MAIN T1" > summary.txt
node $J/tools/identcmp.mjs lane0_T2.json main_T2.json "p4orb=0 T2 vs MAIN T2" >> summary.txt
node $J/tools/identcmp.mjs lane0_T1hold.json main_T1hold.json "p4orb=0 T1 HOLD vs MAIN T1 HOLD" >> summary.txt
node $J/tools/identcmp.mjs lane_T1hold.json main_T1hold.json "lane ON T1 HOLD vs MAIN (expect DIFFER)" >> summary.txt
cat summary.txt
