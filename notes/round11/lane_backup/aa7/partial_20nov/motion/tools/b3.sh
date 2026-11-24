#!/bin/zsh
# fixer batch 3: v3 (R-1 / R-2) and knee (R-3) on the fixed AA6: medium / reverse ?ffblock=0, rest default / ?ffblock=0
F=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/fix; T=$F/tools; t0=$(date +%s)
node $T/cap.mjs --port 5196 --path medium --rows 380,766 --frames 240 --qs "ffblock=0" --out $F/caps/medium_A6f0n > $F/logs/b3_medium_f0.log 2>&1
node $T/cap.mjs --port 5196 --path reverse --rows 380,766 --frames 120 --qs "ffblock=0" --out $F/caps/reverse_A6f0n > $F/logs/b3_reverse_f0.log 2>&1
node $T/cap.mjs --port 5196 --path rest --rows 380,766 --frames 40 --out $F/caps/rest_A6n > $F/logs/b3_rest.log 2>&1
node $T/cap.mjs --port 5196 --path rest --rows 380,766 --frames 40 --qs "ffblock=0" --out $F/caps/rest_A6f0n > $F/logs/b3_rest_f0.log 2>&1
echo "b3 $(( $(date +%s) - t0 ))s"
