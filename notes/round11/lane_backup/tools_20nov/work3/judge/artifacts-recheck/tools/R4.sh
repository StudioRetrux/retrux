#!/bin/zsh
# G2 regression: tab, resize, leave/re-enter, DPR 2
T=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/artifacts/tools; C=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/artifacts-recheck/caps
node $T/jcap.mjs --case tab --out $C/tab --variants "lane:5181,off:5181:lktaa=0"
node $T/jcap.mjs --case resize --out $C/resize --variants "lane:5181,off:5181:lktaa=0"
node $T/jcap.mjs --case dpr2 --out $C/dpr2 --dsf 2 --rows 430,766 --variants "lane:5181,off:5181:lktaa=0"
