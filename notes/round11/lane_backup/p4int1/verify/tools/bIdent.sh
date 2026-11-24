#!/bin/zsh
# verify_int1 ident batch: all four lanes off on :5173 vs :5199 (int1's identP repro at T1/T0 + my identV at T1/T0/T2/plate/p06) + a live negative control
V=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/verify_int1
cd $V
OFF='p4env=0&p4ice=0&p4orb=0&p4hold=0'
P() { node tools/identP.mjs "$@" > /dev/null }
Q() { node tools/identV.mjs "$@" > /dev/null }
P06='(()=>{const h=window.__hero;h.debug.pose("expand",0);h.debug.settle(0.1);h.debug.pose("expand",2.97);})()'
date +%T
P --port 5199 --out ident/P_m_T1.json
P --port 5173 --qs "$OFF" --out ident/P_off_T1.json
P --port 5199 --mobile --out ident/P_m_T0.json
P --port 5173 --mobile --qs "$OFF" --out ident/P_off_T0.json
Q --port 5199 --out ident/V_m_T1.json
Q --port 5173 --qs "$OFF" --out ident/V_off_T1.json
Q --port 5199 --mobile --out ident/V_m_T0.json
Q --port 5173 --mobile --qs "$OFF" --out ident/V_off_T0.json
Q --port 5199 --tier T2 --out ident/V_m_T2.json
Q --port 5173 --tier T2 --qs "$OFF" --out ident/V_off_T2.json
Q --port 5199 --qs envlake=plate --out ident/V_m_plate.json
Q --port 5173 --qs "envlake=plate&$OFF" --out ident/V_off_plate.json
Q --port 5199 --pre "$P06" --out ident/V_m_p06.json
Q --port 5173 --qs "$OFF" --pre "$P06" --out ident/V_off_p06.json
Q --port 5173 --out ident/V_on_T1.json
Q --port 5173 --mobile --out ident/V_on_T0.json
date +%T
echo IDENT DONE
