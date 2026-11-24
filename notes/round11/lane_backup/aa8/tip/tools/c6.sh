#!/bin/zsh
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/tip/tools; t0=$(date +%s)
node glide/jcap.mjs --case gov --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/tip/caps/gov --rows 380,766 --variants "tip:5198" ; echo "gov $(( $(date +%s) - t0 ))s"
node glide/jcap.mjs --case holdre --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/tip/caps/holdF --rows 380,766 --variants "tip:5198,a7:5197,base:5182:mask" ; echo "holdF $(( $(date +%s) - t0 ))s"
