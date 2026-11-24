#!/bin/zsh
# judge_p4hold ident batch A: rest (?p4hold=0 vs :5199 at T1, T2, T0 phone, plate; lane default at rest T1)
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4hold
cd $J
I() { node tools/identS.mjs "$@" }
I --port 5199 --out ident/m_T1.json > /dev/null
I --port 5178 --qs p4hold=0 --out ident/off_T1.json > /dev/null
I --port 5178 --out ident/lane_T1.json > /dev/null
I --port 5199 --tier T2 --out ident/m_T2.json > /dev/null
I --port 5178 --tier T2 --qs p4hold=0 --out ident/off_T2.json > /dev/null
I --port 5199 --mobile --out ident/m_T0.json > /dev/null
I --port 5178 --mobile --qs p4hold=0 --out ident/off_T0.json > /dev/null
I --port 5199 --qs envlake=plate --out ident/m_plate.json > /dev/null
I --port 5178 --qs envlake=plate\&p4hold=0 --out ident/off_plate.json > /dev/null
echo A done
