#!/bin/zsh
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4env/jfix/id
T=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4env/tools/ident.mjs
node $T --port 5174 --still --png /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4env/jfix/id/still_on.png --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4env/jfix/id/still_on.json > still_on.log 2>&1; echo "still_on $(date +%T)"
node $T --port 5174 --tier T1 --qs p4env=0 --out l_T1.json > l_T1.log 2>&1; echo "T1 $(date +%T)"
node $T --port 5174 --tier T2 --qs p4env=0 --out l_T2.json > l_T2.log 2>&1; echo "T2 $(date +%T)"
node $T --port 5174 --mobile --qs p4env=0 --out l_T0.json > l_T0.log 2>&1; echo "T0 $(date +%T)"
node $T --port 5174 --tier T1 --qs envlake=plate\&p4env=0 --out l_plate.json > l_plate.log 2>&1; echo "plate $(date +%T)"
node $T --port 5174 --tier T1 --out on_T1.json > on_T1.log 2>&1; echo "on $(date +%T)"
echo IDDONE
