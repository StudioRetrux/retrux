#!/bin/zsh
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4atmos
cd $J
P06='(()=>{const h=window.__hero;h.debug.pose("expand",0);h.debug.settle(0.1);h.debug.pose("expand",2.97);})()'
node tools/identP.mjs --port 5173 --mobile --pre "$P06" --out ident/m_T0p06.json > ident/m_T0p06.log 2>&1
node tools/identP.mjs --port 5178 --mobile --pre "$P06" --out ident/on_T0p06.json > ident/on_T0p06.log 2>&1
node tools/identP.mjs --port 5178 --mobile --qs 'fogbank=r11' --pre "$P06" --out ident/fb_T0p06.json > ident/fb_T0p06.log 2>&1
echo idT0 done
