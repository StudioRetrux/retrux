#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; F=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/fix; R=$F/tools/refl; B5=$SP/work5/aa5b/caps; G=$SP/work3/aa3/caps; IC=$SP/work6/integ/caps
until [[ -f $F/caps/medium_A6f/meta.json ]]; do sleep 4; done
cd $R
nice -n 10 node popscan.mjs --mask $B5/medium_bmask --gt $G/medium_gt --thr 40 --r 3 --minpx 6 --k1 239 AA6F=$F/caps/medium_A6f AA6=$IC/medium_A6 A6f0=$IC/medium_A6f0 FIX1=$IC/medium_A6g0f0 > $F/ana/popF_medium.txt 2>&1
nice -n 10 node jgt2.mjs $B5/medium_bmask $F/caps/medium_A6f $G/medium_gt 0 240 > $F/ana/A3_jgt2_medium_final.txt 2>&1
echo ana4 done
