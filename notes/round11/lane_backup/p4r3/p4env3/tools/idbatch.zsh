#!/bin/zsh
W=$1; cd $W/id; T=$W/tools/identP.mjs
node $T --port 5173 --tier T1 --out m_T1.json > m_T1.log 2>&1
node $T --port 5174 --tier T1 --qs p4env3=0 --out l3_T1.json > l3_T1.log 2>&1
node $T --port 5174 --tier T1 --out on_T1.json > on_T1.log 2>&1
node $T --port 5173 --tier T2 --out m_T2.json > m_T2.log 2>&1
node $T --port 5174 --tier T2 --qs p4env3=0 --out l3_T2.json > l3_T2.log 2>&1
node $T --port 5173 --mobile --out m_T0.json > m_T0.log 2>&1
node $T --port 5174 --mobile --qs p4env3=0 --out l3_T0.json > l3_T0.log 2>&1
node $T --port 5174 --mobile --out on_T0.json > on_T0.log 2>&1
node $T --port 5173 --tier T1 --qs envlake=plate --out m_plate.json > m_plate.log 2>&1
node $T --port 5174 --tier T1 --qs envlake=plate\&p4env3=0 --out l3_plate.json > l3_plate.log 2>&1
node $T --port 5173 --tier T1 --qs p4env=0 --out m_off_T1.json > m_off_T1.log 2>&1
node $T --port 5174 --tier T1 --qs p4env=0 --out l_off_T1.json > l_off_T1.log 2>&1
node $T --port 5173 --tier T2 --qs p4env=0 --out m_off_T2.json > m_off_T2.log 2>&1
node $T --port 5174 --tier T2 --qs p4env=0 --out l_off_T2.json > l_off_T2.log 2>&1
echo ID DONE $(date +%T)
