#!/bin/zsh
# judge-motion chain X2 (19:01 re-plan): G1 caps reused from judge-artrefl (APFS clones, same cap.mjs, same URL; paths are per
# frame index, so their 240-frame caps' first frames = mine); own AA7 reverse 120 f to verify byte identity; AA7 raw fast (rims);
# jcap holdre / pump (a7,g0 | a6,base)
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/motion; T=$W/tools; S=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/slot/slot.mjs; C=$W/caps; L=$W/logs; AR=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/artrefl/caps
b() { local lab=$1; shift; node $S run "judge-motion $lab" -- zsh -c "$*" >> $L/chainX.out 2>&1; echo "$(date +%T) $lab done" >> $L/chainX.out; }
b X1 "node $T/cap.mjs --port 5197 --path reverse --rows 380,766 --frames 120 --out $C/reverse_A7own > $L/X1_rev.log 2>&1; node $T/cap.mjs --port 5197 --path fast --rows 380,766 --frames 120 --qs envedge=0 --out $C/fast_A7raw > $L/X1_fraw.log 2>&1"
b X4 "node $T/jcap.mjs --case holdre --rows 380,766 --out $C/holdre --variants 'a7:5197,g0:5197:lkglide=0' > $L/X4.log 2>&1"
b X5 "node $T/jcap.mjs --case holdre --rows 380,766 --out $C/holdre --variants 'a6:5196,base:5182:mask' > $L/X5.log 2>&1"
b X6 "node $T/jcap.mjs --case pump --rows 380,766 --out $C/pump --variants 'a7:5197,g0:5197:lkglide=0' > $L/X6.log 2>&1"
b X7 "node $T/jcap.mjs --case pump --rows 380,766 --out $C/pump --variants 'a6:5196,base:5182:mask' > $L/X7.log 2>&1"
echo "$(date +%T) chainX end" >> $L/chainX.out
