#!/bin/bash
# AA5b batch B: reverse GT (BASE at 2x, lkmeach=1, 2x2 averaged) and clean masks (bloom / lens off) on BASE for the 3 paths.
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5b
cd $W/tools
node cap.mjs --port 5182 --path reverse --vw 2880 --vh 1532 --rows 380,766,766 --qs "lkmeach=1" --out $W/caps/reverse_gt2x && node down2.mjs $W/caps/reverse_gt2x $W/caps/reverse_gt && rm -rf $W/caps/reverse_gt2x
for p in medium slow reverse; do node cap.mjs --port 5182 --path $p --rows 380,766 --mask --out $W/caps/${p}_bmask; done
