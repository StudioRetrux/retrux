#!/bin/zsh
J=$1
cd $J/id
T=$J/tools/ident.mjs
node $T --port 5197 --tier T1 --out m_T1.json > m_T1.log 2>&1
node $T --port 5174 --tier T1 --qs p4env=0 --out l_T1.json > l_T1.log 2>&1
node $T --port 5174 --tier T1 --out on_T1.json > on_T1.log 2>&1
node $T --port 5197 --tier T2 --out m_T2.json > m_T2.log 2>&1
node $T --port 5174 --tier T2 --qs p4env=0 --out l_T2.json > l_T2.log 2>&1
node $T --port 5197 --mobile --out m_T0.json > m_T0.log 2>&1
node $T --port 5174 --mobile --qs p4env=0 --out l_T0.json > l_T0.log 2>&1
node $T --port 5197 --tier T1 --qs envlake=plate --out m_plate.json > m_plate.log 2>&1
node $T --port 5174 --tier T1 --qs envlake=plate\&p4env=0 --out l_plate.json > l_plate.log 2>&1
echo DONE
