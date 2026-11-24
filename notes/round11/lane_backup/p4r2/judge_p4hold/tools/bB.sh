#!/bin/zsh
# judge_p4hold ident batch B: hold poses (?p4hold=0 vs :5199 at p04 / p06 T1, p06 T0 phone; lane p06 must differ)
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4hold
cd $J
I() { node tools/identS.mjs "$@" }
P04='(()=>{const h=window.__hero;h.debug.pose("expand",0);h.debug.settle(0.1);h.debug.pose("expand",0.9);})()'
P06='(()=>{const h=window.__hero;h.debug.pose("expand",0);h.debug.settle(0.1);h.debug.pose("expand",2.97);})()'
P07='(()=>{const h=window.__hero;h.debug.pose("release",0.33);})()'
I --port 5199 --pre "$P04" --out ident/m_p04.json > /dev/null
I --port 5178 --qs p4hold=0 --pre "$P04" --out ident/off_p04.json > /dev/null
I --port 5199 --pre "$P06" --out ident/m_p06.json > /dev/null
I --port 5178 --qs p4hold=0 --pre "$P06" --out ident/off_p06.json > /dev/null
I --port 5178 --pre "$P06" --out ident/lane_p06.json > /dev/null
I --port 5199 --pre "$P07" --out ident/m_p07.json > /dev/null
I --port 5178 --qs p4hold=0 --pre "$P07" --out ident/off_p07.json > /dev/null
I --port 5199 --mobile --pre "$P06" --out ident/m_T0_p06.json > /dev/null
I --port 5178 --mobile --qs p4hold=0 --pre "$P06" --out ident/off_T0_p06.json > /dev/null
echo B done
