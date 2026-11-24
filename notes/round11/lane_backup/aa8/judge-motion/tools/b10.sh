#!/bin/zsh
# fixer batch 10: v3 depth band (R-1) vs the far-floe pale block: lab ffbd0/ffbd1 on the final build, + final ?ffblock=0
F=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/fix; T=$F/tools; t0=$(date +%s)
node $T/cap.mjs --port 5196 --path medium --rows 380,766 --frames 240 --qs "ffbd0=8&ffbd1=16" --out $F/caps/medium_A6f_d8 > $F/logs/b10_d8.log 2>&1
node $T/cap.mjs --port 5196 --path medium --rows 380,766 --frames 240 --qs "ffblock=0" --out $F/caps/medium_A6f_f0 > $F/logs/b10_f0.log 2>&1
echo "b10 $(( $(date +%s) - t0 ))s"
