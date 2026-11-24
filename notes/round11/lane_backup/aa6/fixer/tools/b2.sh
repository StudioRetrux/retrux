#!/bin/zsh
# fixer batch 2: G-1 start ramp (jcap holdre / pump / leavere: fixed AA6, ?lkglide=0, BASE + mask)
F=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/fix; T=$F/tools; t0=$(date +%s)
for c in holdre pump leavere; do node $T/jcap.mjs --case $c --rows 380,766 --out $F/caps/$c --variants "a6:5196,g0:5196:lkglide=0,base:5182:mask" > $F/logs/b2_$c.log 2>&1; echo "$c $(( $(date +%s) - t0 ))s"; done
echo "b2 $(( $(date +%s) - t0 ))s"
