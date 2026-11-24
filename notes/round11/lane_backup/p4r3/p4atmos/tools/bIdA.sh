#!/bin/zsh
# p4atmos ident batch A: rest frames, ?p4atmos=0 on :5178 vs MAIN :5173 (identP: 20 moving frames, final + every target + programs)
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4atmos
cd $W; mkdir -p ident
OFF='p4atmos=0'
I() { node tools/identP.mjs "$@" }
I --port 5173 --out ident/m_T1.json > /dev/null
I --port 5178 --qs "$OFF" --out ident/off_T1.json > /dev/null
I --port 5173 --tier T2 --out ident/m_T2.json > /dev/null
I --port 5178 --tier T2 --qs "$OFF" --out ident/off_T2.json > /dev/null
I --port 5173 --mobile --out ident/m_T0.json > /dev/null
I --port 5178 --mobile --qs "$OFF" --out ident/off_T0.json > /dev/null
I --port 5173 --qs envlake=plate --out ident/m_plate.json > /dev/null
I --port 5178 --qs "envlake=plate&$OFF" --out ident/off_plate.json > /dev/null
echo A done
