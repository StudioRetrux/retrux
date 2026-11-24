#!/bin/zsh
# judge_p4atmos ident (hold poses): ?p4atmos=0 on :5178 vs MAIN :5173, + lane-on negative control
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4atmos
cd $J
OFF='p4atmos=0'
I() { node tools/identP.mjs "$@" }
P04='(()=>{const h=window.__hero;h.debug.pose("expand",0);h.debug.settle(0.1);h.debug.pose("expand",0.9);})()'
P06='(()=>{const h=window.__hero;h.debug.pose("expand",0);h.debug.settle(0.1);h.debug.pose("expand",2.97);})()'
P07='(()=>{const h=window.__hero;h.debug.pose("release",0.33);})()'
P08='(()=>{const h=window.__hero;h.debug.pose("release",0.57);})()'
I --port 5173 --pre "$P06" --out ident/m_p06.json > ident/m_p06.log 2>&1
I --port 5178 --qs "$OFF" --pre "$P06" --out ident/off_p06.json > ident/off_p06.log 2>&1
I --port 5178 --pre "$P06" --out ident/on_p06.json > ident/on_p06.log 2>&1
I --port 5173 --pre "$P08" --out ident/m_p08.json > ident/m_p08.log 2>&1
I --port 5178 --qs "$OFF" --pre "$P08" --out ident/off_p08.json > ident/off_p08.log 2>&1
I --port 5173 --pre "$P04" --out ident/m_p04.json > ident/m_p04.log 2>&1
I --port 5178 --qs "$OFF" --pre "$P04" --out ident/off_p04.json > ident/off_p04.log 2>&1
I --port 5178 --qs 'atmoswl=0&atmosveil2=0&atmosblue2=0&fogbank=r11' --pre "$P06" --out ident/sub_p06.json > ident/sub_p06.log 2>&1
echo idhold done
