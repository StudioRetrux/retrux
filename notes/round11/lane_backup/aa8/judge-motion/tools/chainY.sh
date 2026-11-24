#!/bin/zsh
# judge-motion chain Y: jcap fastrev / leavere (a7,g0,a6,base), gov / resize / tab (a7,a6,base), dpr2 (a7,raw,base)
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/motion; T=$W/tools; S=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/slot/slot.mjs; C=$W/caps; L=$W/logs
b() { local lab=$1; shift; node $S run "judge-motion $lab" -- zsh -c "$*" >> $L/chainY.out 2>&1; echo "$(date +%T) $lab done" >> $L/chainY.out; }
b Y1 "node $T/jcap.mjs --case fastrev --rows 380,766 --out $C/fastrev --variants 'a7:5197,g0:5197:lkglide=0,a6:5196,base:5182:mask' > $L/Y1.log 2>&1"
b Y2 "node $T/jcap.mjs --case leavere --rows 380,766 --out $C/leavere --variants 'a7:5197,g0:5197:lkglide=0,a6:5196,base:5182:mask' > $L/Y2.log 2>&1"
b Y3 "node $T/jcap.mjs --case gov --rows 380,766 --out $C/gov --variants 'a7:5197,a6:5196,base:5182:mask' > $L/Y3g.log 2>&1; node $T/jcap.mjs --case resize --rows 380,766 --out $C/resize --variants 'a7:5197,a6:5196,base:5182:mask' > $L/Y3r.log 2>&1"
b Y4 "node $T/jcap.mjs --case tab --rows 380,766 --out $C/tab --variants 'a7:5197,a6:5196,base:5182:mask' > $L/Y4t.log 2>&1"
b Y5 "node $T/jcap.mjs --case dpr2 --dsf 2 --rows 380,766 --out $C/dpr2 --variants 'a7:5197,raw:5197:envedge=0,base:5182:mask' > $L/Y5.log 2>&1"
echo "$(date +%T) chainY end" >> $L/chainY.out
