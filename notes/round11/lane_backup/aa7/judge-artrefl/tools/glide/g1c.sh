#!/bin/zsh
# prejudge-glide G1c (lean, 18:25): aa5a's glide.mjs, slow k1-159, F1 (aa5a) / AA6 / GT only, sample stride 6 (same samples for both)
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/glide; T=$W/tools; A5=$SP/work5/aa5a/caps; G=$SP/work3/aa3/caps
until [[ -f $W/caps/slow_A6/meta.json ]]; do sleep 5; done
t0=$(date +%s)
nice -n 10 node $T/glide.mjs --mask $A5/slow_mask --motion $SP/work3/aa3/ana/slow_C3.json --seq GT=$G/slow_gt --seq F1=$A5/slow_F1 --seq AA6=$W/caps/slow_A6 --gt GT --k1 159 --minc 40 --cap 1 --sstride 6 --out $W/ana/glide_slow.json 2>&1 | grep -vE "^DBG|^   " > $W/ana/glide_slow.txt
echo "glide slow $(( $(date +%s) - t0 ))s"
