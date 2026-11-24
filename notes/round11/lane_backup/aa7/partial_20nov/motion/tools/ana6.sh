#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; F=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/fix; R=$F/tools/refl; B5=$SP/work5/aa5b/caps; G=$SP/work3/aa3/caps; IC=$SP/work6/integ/caps; RC=$SP/work6/refl/caps
until [[ -f $F/caps/medium_A6z/meta.json ]]; do sleep 4; done
cd $R
nice -n 10 node popscan.mjs --mask $B5/medium_bmask --gt $G/medium_gt --thr 40 --r 3 --minpx 6 --k1 239 AA6Z=$F/caps/medium_A6z AA6=$IC/medium_A6 A6f0=$IC/medium_A6f0 FIX1=$IC/medium_A6g0f0 > $F/ana/popZ_medium.txt 2>&1
nice -n 10 node popnew.mjs --mask $B5/medium_bmask --gt $G/medium_gt --x $F/caps/medium_A6z --ref $IC/medium_A6 --thr 40 --margin 10 --r 3 > $F/ana/popnewZ_medium_vs_AA6old.txt 2>&1
nice -n 10 node popnew.mjs --mask $B5/medium_bmask --gt $G/medium_gt --x $F/caps/medium_A6z --ref $IC/medium_A6g0f0 --thr 40 --margin 10 --r 3 > $F/ana/popnewZ_medium_vs_FIX1.txt 2>&1
nice -n 10 node v3err.mjs --mask $B5/medium_bmask --gt $G/medium_gt --x $F/caps/medium_A6z --ref $IC/medium_A6f0 --thr 20 --json $F/ana/v3errZ_medium.json > $F/ana/v3errZ_medium.txt 2>&1
for b in 880,738,1070,766 50,525,185,590; do echo "medium $b FINAL: $(node boxerr.mjs $F/ana/v3errZ_medium.json $b | tr '\n' ' ')"; done > $F/ana/boxerrZ.txt
nice -n 10 node jgt2.mjs $B5/medium_bmask $F/caps/medium_A6z $G/medium_gt 0 240 > $F/ana/A3_jgt2_medium_Z.txt 2>&1
until [[ -f $F/caps/rest_A6z/meta.json ]]; do sleep 4; done
nice -n 10 node v3err.mjs --mask $RC/rest_bmask --gt $B5/rest_gt --x $F/caps/rest_A6z --ref $RC/rest_A6f0 --thr 16 --json $F/ana/v3errZ_rest.json > $F/ana/v3errZ_rest.txt 2>&1
for b in 880,738,1070,766 50,525,185,590; do echo "rest $b FINAL: $(node boxerr.mjs $F/ana/v3errZ_rest.json $b | tr '\n' ' ')"; done >> $F/ana/boxerrZ.txt
echo ana6 done
