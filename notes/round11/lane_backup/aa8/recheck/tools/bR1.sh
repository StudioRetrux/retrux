#!/bin/zsh
# AA8 recheck batch R1: fresh stepped G1 captures of the six paths on the FINAL build (:5199, pid 6233), = the motion judge's args
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/recheck; T=$W/tools/m; t0=$(date +%s)
node $T/cap.mjs --port 5199 --path medium --rows 380,766 --frames 240 --out $W/caps/medium_A8f > $W/logs/R1_medium.log 2>&1; echo "$(date +%T) medium $(( $(date +%s) - t0 ))s"
node $T/cap.mjs --port 5199 --path slow --rows 380,766 --frames 160 --out $W/caps/slow_A8f > $W/logs/R1_slow.log 2>&1; echo "$(date +%T) slow $(( $(date +%s) - t0 ))s"
for p in fast diag reverse leave; do node $T/cap.mjs --port 5199 --path $p --rows 380,766 --frames 120 --out $W/caps/${p}_A8f > $W/logs/R1_$p.log 2>&1; echo "$(date +%T) $p $(( $(date +%s) - t0 ))s"; done
