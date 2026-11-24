#!/bin/zsh
# fixer batch 6: governor steps (G-1 ramp after the history resets, G-3 pale block at 0.7): fixed AA6, ?envedge=0, BASE + mask
F=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/fix; T=$F/tools; t0=$(date +%s)
node $T/jcap.mjs --case gov --rows 380,766 --out $F/caps/gov --variants "a6:5196,raw:5196:envedge=0,base:5182:mask" > $F/logs/b6.log 2>&1
echo "b6 $(( $(date +%s) - t0 ))s"
