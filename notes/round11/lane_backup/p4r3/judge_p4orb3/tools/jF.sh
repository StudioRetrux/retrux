#!/bin/zsh
# judge p4orb3 batch F: ident T2 ?p4orb3=0 vs :5173, T0 phone lane ON vs :5173
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4orb3
T=$J/tools/identP.mjs; O=$J/ident
date +%T
node $T --port 5173 --tier T2 --out $O/main_T2.json
node $T --port 5176 --tier T2 --qs p4orb3=0 --out $O/lane0_T2.json
node $T --port 5173 --mobile --out $O/main_T0.json
node $T --port 5176 --mobile --out $O/lane_T0.json
date +%T
