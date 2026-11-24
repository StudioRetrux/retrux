#!/bin/zsh
F=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/fix; T=$F/tools; t0=$(date +%s)
zsh $T/g8b.sh
node $T/jcap.mjs --case holdre --rows 380,766 --out $F/caps/holdre_z --variants "a6:5196" > $F/logs/b15_holdre.log 2>&1
node $F/tools/integ/aa5a/g10.mjs --port 5196 > $F/ana/g10_final.txt 2>&1
echo "b15 $(( $(date +%s) - t0 ))s"
