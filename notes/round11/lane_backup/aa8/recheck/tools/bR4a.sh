#!/bin/zsh
# AA8 recheck batch R4a: jcap holdre (press / release / re-press) a8 :5199 / a7 :5197 / base :5182 (+mask), rows 380-766 (= the art judge's bC1)
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/recheck/tools/a; t0=$(date +%s)
node glide/jcap.mjs --case holdre --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/recheck/caps/holdre --rows 380,766 --variants "a8:5199,a7:5197,base:5182:mask" > /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/recheck/logs/R4_holdre.log 2>&1; echo "$(date +%T) holdre $(( $(date +%s) - t0 ))s"
