#!/bin/zsh
F=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/fix; T=$F/tools; t0=$(date +%s)
node $T/cap.mjs --port 5196 --path medium --rows 380,766 --frames 240 --qs "ffbd0=20&ffbd1=40" --out $F/caps/medium_A6f_d20 > $F/logs/b11_d20.log 2>&1
echo "b11 $(( $(date +%s) - t0 ))s"
