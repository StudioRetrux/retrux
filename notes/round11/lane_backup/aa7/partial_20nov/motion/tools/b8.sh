#!/bin/zsh
# fixer batch 8: G8 idents, then the holdre start on the final build (a6 only; g0 / base are unchanged builds)
F=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/fix; T=$F/tools; t0=$(date +%s)
zsh $T/g8.sh
node $T/jcap.mjs --case holdre --rows 380,766 --out $F/caps/holdre_final --variants "a6:5196" > $F/logs/b8_holdre.log 2>&1
echo "b8 $(( $(date +%s) - t0 ))s"
