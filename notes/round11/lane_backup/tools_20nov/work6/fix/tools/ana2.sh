#!/bin/zsh
# fixer: R-1 / R-2 (v3err boxes, popscan pale block) and R-3 (jgt2 thin dark) on the fixed AA6
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; F=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/fix; R=$F/tools/refl; B5=$SP/work5/aa5b/caps; G=$SP/work3/aa3/caps; RC=$SP/work6/refl/caps; IC=$SP/work6/integ/caps
until [[ -f $F/caps/rest_A6f0n/meta.json ]]; do sleep 4; done
cd $R
nice -n 10 node v3err.mjs --mask $B5/medium_bmask --gt $G/medium_gt --x $F/caps/medium_A6n --ref $F/caps/medium_A6f0n --thr 20 --json $F/ana/v3err_medium_n.json > $F/ana/v3err_medium_n.txt 2>&1
nice -n 10 node v3err.mjs --mask $B5/reverse_bmask --gt $B5/reverse_gt --x $F/caps/reverse_A6n --ref $F/caps/reverse_A6f0n --thr 20 --k1 119 --json $F/ana/v3err_reverse_n.json > $F/ana/v3err_reverse_n.txt 2>&1
nice -n 10 node v3err.mjs --mask $RC/rest_bmask --gt $B5/rest_gt --x $F/caps/rest_A6n --ref $F/caps/rest_A6f0n --thr 16 --json $F/ana/v3err_rest_n.json > $F/ana/v3err_rest_n.txt 2>&1
for p in medium reverse rest; do for b in 880,738,1070,766 50,525,185,590; do echo "$p $b NEW: $(node boxerr.mjs $F/ana/v3err_${p}_n.json $b | tr '\n' ' ')"; done; done > $F/ana/boxerr_new.txt
for p in medium reverse rest; do for b in 880,738,1070,766 50,525,185,590; do echo "$p $b OLD: $(node boxerr.mjs $SP/work6/refl/ana/v3err_${p}_A6_vs_A6f0.json $b | tr '\n' ' ')"; done; done > $F/ana/boxerr_old.txt
nice -n 10 node popscan.mjs --mask $B5/medium_bmask --gt $G/medium_gt --thr 40 --r 3 --minpx 6 --k1 239 --json $F/ana/pop_medium.json AA6N=$F/caps/medium_A6n A6f0N=$F/caps/medium_A6f0n AA6=$IC/medium_A6 FIX1=$IC/medium_A6g0f0 > $F/ana/pop_medium.txt 2>&1
nice -n 10 node popscan.mjs --mask $B5/reverse_bmask --gt $B5/reverse_gt --thr 40 --r 3 --minpx 6 --k1 119 --json $F/ana/pop_reverse.json AA6N=$F/caps/reverse_A6n A6f0N=$F/caps/reverse_A6f0n AA6=$RC/reverse_A6 FIX1=$RC/reverse_FIX1 > $F/ana/pop_reverse.txt 2>&1
nice -n 10 node popnew.mjs --mask $B5/medium_bmask --gt $G/medium_gt --x $F/caps/medium_A6n --ref $IC/medium_A6g0f0 --thr 40 --margin 10 --r 3 > $F/ana/popnew_medium_A6N_vs_FIX1.txt 2>&1
nice -n 10 node jgt2.mjs $B5/medium_bmask $F/caps/medium_A6n $G/medium_gt 0 240 > $F/ana/A3_jgt2_medium_n.txt 2>&1
nice -n 10 node jgt2.mjs $RC/rest_bmask $F/caps/rest_A6n $B5/rest_gt 0 40 > $F/ana/A3_jgt2_rest_n.txt 2>&1
echo ana2 done
