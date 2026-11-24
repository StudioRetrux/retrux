#!/bin/zsh
# recheck gov1: the same gov camera path with the governor steps skipped (render scale 1 throughout): final and BASE, for the tip-patch question
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/recheck/tools/fx/ar; t0=$(date +%s)
node glide/jcapS1.mjs --case gov --noscale --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/recheck/caps/gov1 --rows 380,766 --variants "fin1:5197,base1:5182:mask"; echo "gov1 $(( $(date +%s) - t0 ))s"
