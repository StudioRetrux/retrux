#!/bin/zsh
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/motion
t0=$(date +%s)
node $J/tools/cap.mjs --port 5182 --out $J/caps/gt_reverse2x --path reverse --vw 2880 --vh 1532 --dsf 1 --qs lkmeach=1 --rows 760,1532 --frames 240
node $J/tools/down2.mjs $J/caps/gt_reverse2x $J/caps/gt_reverse
echo "[G] reverse GT $(( $(date +%s) - t0 )) s"
