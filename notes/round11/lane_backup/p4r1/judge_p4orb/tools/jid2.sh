#!/bin/zsh
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4orb
T=$J/tools/identP.mjs
node $T --port 5176 --mobile --out $J/ident/lane_T0.json
node $T --port 5197 --mobile --out $J/ident/main_T0.json
node $T --port 5176 --tier T1 --qs envlake=plate\&p4orb=0 --out $J/ident/lane0_plate.json
node $T --port 5197 --tier T1 --qs envlake=plate --out $J/ident/main_plate.json
cd $J/ident
node $J/tools/identcmp.mjs lane_T0.json main_T0.json "lane ON T0 phone vs MAIN T0" >> summary.txt
node $J/tools/identcmp.mjs lane0_plate.json main_plate.json "p4orb=0 envlake=plate vs MAIN plate" >> summary.txt
tail -2 summary.txt
