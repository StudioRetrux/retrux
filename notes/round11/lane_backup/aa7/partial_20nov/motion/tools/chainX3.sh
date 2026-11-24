#!/bin/zsh
# judge-motion chain X3 (20:02 re-plan for slot contention): own AA7 reverse (identity check vs artrefl's) + AA7 raw fast (rims);
# jcap holdre / pump with a7, g0, base(mask) (a6 for these from the AA6 fixer's same deterministic case runs)
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/motion; T=$W/tools; S=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/slot/slot.mjs; C=$W/caps; L=$W/logs
b() { local lab=$1; shift; node $S run "judge-motion $lab" -- zsh -c "$*" >> $L/chainX.out 2>&1; echo "$(date +%T) $lab done" >> $L/chainX.out; }
b X1 "node $T/jcap.mjs --case holdre --rows 380,766 --out $C/holdre --variants 'a7:5197,g0:5197:lkglide=0,base:5182:mask' > $L/X1_holdre.log 2>&1"
b X2 "node $T/jcap.mjs --case pump --rows 380,766 --out $C/pump --variants 'a7:5197,g0:5197:lkglide=0,base:5182:mask' > $L/X2_pump.log 2>&1"
b X3 "node $T/cap.mjs --port 5197 --path reverse --rows 380,766 --frames 120 --out $C/reverse_A7own > $L/X3_rev.log 2>&1; node $T/cap.mjs --port 5197 --path fast --rows 380,766 --frames 120 --qs envedge=0 --out $C/fast_A7raw > $L/X3_fraw.log 2>&1"
echo "$(date +%T) chainX end" >> $L/chainX.out
