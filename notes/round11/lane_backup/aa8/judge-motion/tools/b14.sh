#!/bin/zsh
# fixer batch 14: G1 paths on the FINAL AA6 (built 19:22: G-1 ramp + v3 R-1 / R-2 with the 8-16 m band; knee 0.5, no gate)
F=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/fix; T=$F/tools; t0=$(date +%s)
node $T/cap.mjs --port 5196 --path medium --rows 380,766 --frames 240 --out $F/caps/medium_A6z > $F/logs/b14_medium.log 2>&1
node $T/cap.mjs --port 5196 --path slow --rows 380,766 --frames 160 --out $F/caps/slow_A6z > $F/logs/b14_slow.log 2>&1
for p in fast diag reverse leave; do node $T/cap.mjs --port 5196 --path $p --rows 380,766 --frames 120 --out $F/caps/${p}_A6z > $F/logs/b14_$p.log 2>&1; done
node $T/cap.mjs --port 5196 --path rest --rows 380,766 --frames 40 --out $F/caps/rest_A6z > $F/logs/b14_rest.log 2>&1
echo "b14 $(( $(date +%s) - t0 ))s"
