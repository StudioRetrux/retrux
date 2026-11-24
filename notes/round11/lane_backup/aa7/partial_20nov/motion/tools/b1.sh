#!/bin/zsh
# fixer batch 1: G1 paths on the fixed AA6 (:5196, built 18:48)
F=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/fix; T=$F/tools; t0=$(date +%s)
node $T/cap.mjs --port 5196 --path slow --rows 380,766 --frames 160 --out $F/caps/slow_A6n > $F/logs/b1_slow.log 2>&1
node $T/cap.mjs --port 5196 --path medium --rows 380,766 --frames 240 --out $F/caps/medium_A6n > $F/logs/b1_medium.log 2>&1
for p in fast diag reverse leave; do node $T/cap.mjs --port 5196 --path $p --rows 380,766 --frames 120 --out $F/caps/${p}_A6n > $F/logs/b1_$p.log 2>&1; done
echo "b1 $(( $(date +%s) - t0 ))s"
