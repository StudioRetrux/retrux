#!/bin/zsh
# fixer batch 7: G1 paths on the FINAL AA6 (:5196, built 19:08: G-1 ramp, knee 1.0 with the glide, v3 R-1 / R-2; no gate)
F=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/fix; T=$F/tools; t0=$(date +%s)
node $T/cap.mjs --port 5196 --path medium --rows 380,766 --frames 240 --out $F/caps/medium_A6f > $F/logs/b7_medium.log 2>&1
node $T/cap.mjs --port 5196 --path slow --rows 380,766 --frames 160 --out $F/caps/slow_A6f > $F/logs/b7_slow.log 2>&1
for p in fast diag reverse leave; do node $T/cap.mjs --port 5196 --path $p --rows 380,766 --frames 120 --out $F/caps/${p}_A6f > $F/logs/b7_$p.log 2>&1; done
echo "b7 $(( $(date +%s) - t0 ))s"
