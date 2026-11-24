#!/bin/zsh
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/motion
t0=$(date +%s)
node $J/tools/cap.mjs --port 5182 --out $J/caps/gtchk_slow2x --path slow --vw 2880 --vh 1532 --dsf 1 --qs lkmeach=1 --rows 760,1532 --frames 16
node $J/tools/down2.mjs $J/caps/gtchk_slow2x $J/caps/gtchk_slow
node $J/tools/cap.mjs --port 5182 --out $J/caps/gtchk_medium2x --path medium --vw 2880 --vh 1532 --dsf 1 --qs lkmeach=1 --rows 760,1532 --frames 16
node $J/tools/down2.mjs $J/caps/gtchk_medium2x $J/caps/gtchk_medium
echo "[E] checks $(( $(date +%s) - t0 )) s"
