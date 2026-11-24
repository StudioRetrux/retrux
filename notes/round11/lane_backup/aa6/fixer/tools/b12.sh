#!/bin/zsh
F=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/fix; T=$F/tools; t0=$(date +%s)
node $T/cap.mjs --port 5196 --path diag --rows 380,766 --frames 120 --qs "ffbd0=8&ffbd1=16" --out $F/caps/diag_d8 > $F/logs/b12_a.log 2>&1
node $T/cap.mjs --port 5196 --path fast --rows 380,766 --frames 120 --qs "ffbd0=8&ffbd1=16" --out $F/caps/fast_d8 > $F/logs/b12_b.log 2>&1
echo "b12 $(( $(date +%s) - t0 ))s"
