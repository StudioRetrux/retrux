#!/bin/zsh
# judge-motion chain B: jcap events a7 / g0 (?lkglide=0) / a6 (:5196) / base (+mask)
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/motion; T=$W/tools; S=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/slot/slot.mjs; C=$W/caps; L=$W/logs
b() { local lab=$1; shift; node $S run "!judge-motion $lab" -- zsh -c "$*" >> $L/cB.out 2>&1; echo "$(date +%T) $lab done" >> $L/cB.out; }
V4="a7:5197,g0:5197:lkglide=0,a6:5196,base:5182:mask"
b B1 "node $T/jcap.mjs --case holdre --rows 380,766 --out $C/holdre --variants '$V4' > $L/B1.log 2>&1"
b B2 "node $T/jcap.mjs --case pump --rows 380,766 --out $C/pump --variants '$V4' > $L/B2.log 2>&1"
b B3 "node $T/jcap.mjs --case fastrev --rows 380,766 --out $C/fastrev --variants '$V4' > $L/B3a.log 2>&1; node $T/jcap.mjs --case leavere --rows 380,766 --out $C/leavere --variants '$V4' > $L/B3b.log 2>&1"
b B4 "node $T/jcap.mjs --case gov --rows 380,766 --out $C/gov --variants 'a7:5197,g0:5197:lkglide=0,a6:5196,base:5182:mask' > $L/B4g.log 2>&1; node $T/jcap.mjs --case resize --rows 380,766 --out $C/resize --variants 'a7:5197,a6:5196,base:5182:mask' > $L/B4r.log 2>&1"
b B5 "node $T/jcap.mjs --case tab --rows 380,766 --out $C/tab --variants 'a7:5197,a6:5196,base:5182:mask' > $L/B5t.log 2>&1; node $T/jcap.mjs --case dpr2 --dsf 2 --rows 380,766 --out $C/dpr2 --variants 'a7:5197,raw:5197:envedge=0,a6:5196,base:5182:mask' > $L/B5d.log 2>&1"
echo "$(date +%T) cB end" >> $L/cB.out
