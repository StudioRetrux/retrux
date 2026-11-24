#!/bin/zsh
# fixer batch 0 (old build on :5196): cause split of G-2 on reverse: band sigma 0.6 (no sharpening) / fast weight 0.5
F=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/fix; T=$F/tools
t0=$(date +%s)
node $T/cap.mjs --port 5196 --path reverse --rows 380,766 --frames 120 --qs "lkgsb=0.6" --out $F/caps/reverse_old_sb06 > $F/logs/b0_sb06.log 2>&1
node $T/cap.mjs --port 5196 --path reverse --rows 380,766 --frames 120 --qs "lkgwf=0.5" --out $F/caps/reverse_old_wf05 > $F/logs/b0_wf05.log 2>&1
echo "b0 $(( $(date +%s) - t0 ))s"
