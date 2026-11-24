#!/bin/zsh
# batch 2: MLAA variants on medium, 121 frames (lab-only params need debug=1, which cap.mjs always sets)
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work4/aa4y
cd $W/tools
t0=$(date +%s)
node cap.mjs --port 5192 --out $W/caps/medium_MX0 --path medium --frames 121 --rows 380,766 --qs "lktaaw=0.0001&lkmlaa=0"; echo "t $(( $(date +%s) - t0 ))s"
node cap.mjs --port 5192 --out $W/caps/medium_MXZQ --path medium --frames 121 --rows 380,766 --qs "lktaaw=0.0001&lkmlaaz=1&lkmlaaq=1&lkmlaarun=6"; echo "t $(( $(date +%s) - t0 ))s"
node cap.mjs --port 5192 --out $W/caps/medium_MXQ --path medium --frames 121 --rows 380,766 --qs "lktaaw=0.0001&lkmlaaq=1"; echo "t $(( $(date +%s) - t0 ))s"
node cap.mjs --port 5192 --out $W/caps/medium_MZQ --path medium --frames 121 --rows 380,766 --qs "lkmlaaz=1&lkmlaaq=1&lkmlaarun=6"; echo "t $(( $(date +%s) - t0 ))s"
