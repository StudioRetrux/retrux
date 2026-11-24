#!/bin/zsh
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/motion; T=$W/tools; S=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/slot/slot.mjs; C=$W/caps; L=$W/logs
b() { local lab=$1; shift; node $S run "judge8-motion $lab" -- zsh -c "$*" >> $L/cM4.out 2>&1; echo "$(date +%T) $lab done" >> $L/cM4.out; }
b X1 "node $T/cap.mjs --port 5199 --path fast --rows 380,766 --frames 120 --qs envedge=0 --out $C/fast_A8raw > $L/X1.log 2>&1; node $T/jcap.mjs --case leavere --rows 380,766 --out $C/leavere --variants 'a8:5199,a7:5197,g0:5199:lkglide=0,base:5182:mask' > $L/X1b.log 2>&1"
b X2 "node $T/jcap.mjs --case dpr2 --dsf 2 --rows 380,766 --out $C/dpr2 --variants 'a8:5199,raw:5199:envedge=0,a7:5197,base:5182:mask' > $L/X2.log 2>&1"
echo "$(date +%T) cM4 end" >> $L/cM4.out
