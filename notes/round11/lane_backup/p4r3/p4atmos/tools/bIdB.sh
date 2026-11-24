#!/bin/zsh
# p4atmos ident batch B: hold / release poses, ?p4atmos=0 vs MAIN
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4atmos
cd $W; mkdir -p ident
OFF='p4atmos=0'
I() { node tools/identP.mjs "$@" }
P04='(()=>{const h=window.__hero;h.debug.pose("expand",0);h.debug.settle(0.1);h.debug.pose("expand",0.9);})()'
P06='(()=>{const h=window.__hero;h.debug.pose("expand",0);h.debug.settle(0.1);h.debug.pose("expand",2.97);})()'
P07='(()=>{const h=window.__hero;h.debug.pose("release",0.33);})()'
P08='(()=>{const h=window.__hero;h.debug.pose("release",0.57);})()'
I --port 5173 --pre "$P04" --out ident/m_p04.json > /dev/null
I --port 5178 --qs "$OFF" --pre "$P04" --out ident/off_p04.json > /dev/null
I --port 5173 --pre "$P06" --out ident/m_p06.json > /dev/null
I --port 5178 --qs "$OFF" --pre "$P06" --out ident/off_p06.json > /dev/null
I --port 5173 --pre "$P07" --out ident/m_p07.json > /dev/null
I --port 5178 --qs "$OFF" --pre "$P07" --out ident/off_p07.json > /dev/null
I --port 5173 --pre "$P08" --out ident/m_p08.json > /dev/null
I --port 5178 --qs "$OFF" --pre "$P08" --out ident/off_p08.json > /dev/null
echo B done
