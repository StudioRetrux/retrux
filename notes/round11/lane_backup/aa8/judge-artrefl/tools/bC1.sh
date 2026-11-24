#!/bin/zsh
# jcap holdre (press / release / re-press) a8 / a7 / base+mask, rows 380-766
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/artrefl/tools; t0=$(date +%s)
node glide/jcap.mjs --case holdre --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/artrefl/caps/holdre --rows 380,766 --variants "a8:5199,a7:5197,base:5182:mask" > /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/artrefl/logs/C1_holdre.log 2>&1; echo "holdre $(( $(date +%s) - t0 ))s"
