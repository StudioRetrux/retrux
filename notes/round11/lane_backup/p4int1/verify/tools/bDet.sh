#!/bin/zsh
# verify_int1 batch 2: deterministic qc poses (int1's detq) for hold-only / env-only int1 vs the hold lane :5178 / env lane :5174 + int1 default,
# a later-time T0 ident (settle 90 s) int1 default vs :5199, and the console probe (visitor URL, all console types)
V=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/verify_int1
cd $V; date +%T
node tools/detq.mjs 5173 det/i > det/i.log 2>&1
node tools/detq.mjs 5173 det/hold_only 'p4env=0&p4ice=0&p4orb=0' > det/hold_only.log 2>&1
node tools/detq.mjs 5178 det/hold_lane > det/hold_lane.log 2>&1
node tools/detq.mjs 5199 det/main > det/main.log 2>&1
echo "$(date +%T) det done"
L90='(()=>{window.__hero.debug.settle(90);})()'
node tools/identV.mjs --port 5199 --mobile --pre "$L90" --out ident/V_m_T0_late.json > /dev/null
node tools/identV.mjs --port 5173 --mobile --pre "$L90" --out ident/V_on_T0_late.json > /dev/null
node tools/identV.mjs --port 5199 --pre "$L90" --out ident/V_m_T1_late.json > /dev/null
node tools/identV.mjs --port 5173 --qs 'p4env=0&p4ice=0&p4orb=0&p4hold=0' --pre "$L90" --out ident/V_off_T1_late.json > /dev/null
echo "$(date +%T) late ident done"
node tools/consoleprobe.mjs 'http://localhost:5173/' console/int1_desktop.json
node tools/consoleprobe.mjs 'http://localhost:5199/' console/main_desktop.json
node tools/consoleprobe.mjs 'http://localhost:5173/' console/int1_phone.json --mobile
node tools/consoleprobe.mjs 'http://localhost:5199/' console/main_phone.json --mobile
echo "$(date +%T) BATCH2 DONE"
