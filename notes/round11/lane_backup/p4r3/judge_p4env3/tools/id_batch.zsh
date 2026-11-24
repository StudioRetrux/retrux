#!/bin/zsh
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4env3
cd $J/ident; T=$J/tools/identP.mjs
run() { node $T "$@" > ${@[-1]%.json}.log 2>&1; echo "${@[-1]} $(date +%T)"; }
run --port 5173 --tier T1 --qs p4env=0 --out m_off_T1.json
run --port 5174 --tier T1 --qs p4env=0 --out l_off_T1.json
run --port 5173 --tier T2 --qs p4env=0 --out m_off_T2.json
run --port 5174 --tier T2 --qs p4env=0 --out l_off_T2.json
run --port 5173 --tier T1 --out m_T1.json
run --port 5174 --tier T1 --qs p4env3=0 --out l3_T1.json
run --port 5174 --tier T1 --out on_T1.json
run --port 5173 --tier T2 --out m_T2.json
run --port 5174 --tier T2 --qs p4env3=0 --out l3_T2.json
run --port 5173 --mobile --out m_T0.json
run --port 5174 --mobile --qs p4env3=0 --out l3_T0.json
run --port 5174 --mobile --out on_T0.json
run --port 5173 --tier T1 --qs envlake=plate --out m_plate.json
run --port 5174 --tier T1 --qs envlake=plate\&p4env3=0 --out l3_plate.json
run --port 5173 --mobile --qs p4env=0 --out m_off_T0.json
run --port 5174 --mobile --qs p4env=0 --out l_off_T0.json
echo IDDONE $(date +%T)
