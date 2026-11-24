#!/bin/zsh
# p4atmos ident batch C: every sub-switch off (= MAIN) and lane-ON negative controls
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4atmos
cd $W; mkdir -p ident
SUB='atmoswl=0&atmosveil2=0&atmosblue2=0&fogbank=r11'
I() { node tools/identP.mjs "$@" }
P06='(()=>{const h=window.__hero;h.debug.pose("expand",0);h.debug.settle(0.1);h.debug.pose("expand",2.97);})()'
I --port 5178 --qs "$SUB" --out ident/sub_T1.json > /dev/null
I --port 5178 --qs "$SUB" --pre "$P06" --out ident/sub_p06.json > /dev/null
I --port 5178 --out ident/on_T1.json > /dev/null
I --port 5178 --pre "$P06" --out ident/on_p06.json > /dev/null
I --port 5178 --mobile --out ident/on_T0.json > /dev/null
echo C done
