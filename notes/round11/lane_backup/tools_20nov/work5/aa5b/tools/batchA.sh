#!/bin/bash
# AA5b batch A: full lower-half captures of my lane (fix) and AA3 (ffblock=0) on medium / slow / reverse.
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5b
cd $W/tools
for p in medium slow reverse; do node cap.mjs --port 5194 --path $p --rows 380,766 --out $W/caps/${p}_FF; done
node cap.mjs --port 5194 --path reverse --rows 380,766 --qs "ffblock=0" --out $W/caps/reverse_F0
