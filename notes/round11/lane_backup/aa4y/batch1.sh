#!/bin/zsh
# batch 1: smoke + medium (MLAA on / off / MLAA without the TAA history) + slow (MLAA on), 121 frames each, my lab :5192
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work4/aa4y
cd $W/tools
t0=$(date +%s)
node cap.mjs --port 5192 --out $W/caps/smoke --path medium --frames 3 --rows 380,766 || exit 1
if grep -qiE "error|warning" $W/caps/smoke/log.txt; then echo "SMOKE FAILED"; head -20 $W/caps/smoke/log.txt; exit 1; fi
echo "smoke ok $(( $(date +%s) - t0 ))s"
node cap.mjs --port 5192 --out $W/caps/medium_M1 --path medium --frames 121 --rows 380,766; echo "t $(( $(date +%s) - t0 ))s"
node cap.mjs --port 5192 --out $W/caps/medium_M0 --path medium --frames 121 --rows 380,766 --qs "lkmlaa=0"; echo "t $(( $(date +%s) - t0 ))s"
node cap.mjs --port 5192 --out $W/caps/medium_MX --path medium --frames 121 --rows 380,766 --qs "lktaaw=0.0001"; echo "t $(( $(date +%s) - t0 ))s"
node cap.mjs --port 5192 --out $W/caps/slow_M1 --path slow --frames 121 --rows 380,766; echo "t $(( $(date +%s) - t0 ))s"
