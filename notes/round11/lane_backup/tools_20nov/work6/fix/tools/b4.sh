#!/bin/zsh
# fixer batch 4: reversals / flick with the G-2 motion gate (sharpness modulation), fixed AA6 vs ?lkglide=0 vs BASE
F=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/fix; T=$F/tools; t0=$(date +%s)
node $T/jcap.mjs --case fastrev --rows 380,766 --out $F/caps/fastrev --variants "a6:5196,g0:5196:lkglide=0,base:5182:mask" > $F/logs/b4_fastrev.log 2>&1
echo "b4 $(( $(date +%s) - t0 ))s"
