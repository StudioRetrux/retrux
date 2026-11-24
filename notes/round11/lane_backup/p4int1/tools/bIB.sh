#!/bin/zsh
# int1 ident batch B: hold poses (the hold lane's --pre poses), all four lanes off vs :5199, + lane-ON negative controls
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/int1
cd $W
OFF='p4env=0&p4ice=0&p4orb=0&p4hold=0'
I() { node tools/identP.mjs "$@" }
P04='(()=>{const h=window.__hero;h.debug.pose("expand",0);h.debug.settle(0.1);h.debug.pose("expand",0.9);})()'
P06='(()=>{const h=window.__hero;h.debug.pose("expand",0);h.debug.settle(0.1);h.debug.pose("expand",2.97);})()'
P07='(()=>{const h=window.__hero;h.debug.pose("release",0.33);})()'
I --port 5199 --pre "$P04" --out ident/m_p04.json > /dev/null
I --port 5173 --qs "$OFF" --pre "$P04" --out ident/off_p04.json > /dev/null
I --port 5199 --pre "$P06" --out ident/m_p06.json > /dev/null
I --port 5173 --qs "$OFF" --pre "$P06" --out ident/off_p06.json > /dev/null
I --port 5199 --pre "$P07" --out ident/m_p07.json > /dev/null
I --port 5173 --qs "$OFF" --pre "$P07" --out ident/off_p07.json > /dev/null
I --port 5173 --out ident/on_T1.json > /dev/null
I --port 5173 --pre "$P06" --out ident/on_p06.json > /dev/null
I --port 5173 --mobile --out ident/on_T0.json > /dev/null
echo B done
