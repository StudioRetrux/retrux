#!/bin/bash
# AA5b batch C: v2 full lower-half captures on medium / slow / reverse.
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5b
cd $W/tools
tag=${1:-v2}
for p in medium reverse slow; do node cap.mjs --port 5194 --path $p --rows 380,766 --out $W/caps/${p}_$tag ${2:+--qs "$2"}; done
