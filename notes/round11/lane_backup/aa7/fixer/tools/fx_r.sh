#!/bin/zsh
# fixer r: AR-1 repros with the judge's own jcap (artrefl tools): gov (scale 1 / 0.9 / 0.8 / 0.7 / 1) and holdre (scale 1)
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/fixer/tools/ar; t0=$(date +%s)
node glide/jcap.mjs --case gov --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/fixer/caps/gov --rows 380,766 --variants "pre:5199,fin:5197,f0:5197:ffblock=0,base:5182:mask"; echo "gov $(( $(date +%s) - t0 ))s"
node glide/jcap.mjs --case holdre --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/fixer/caps/holdre --rows 560,660 --variants "pre:5199,fin:5197,f0:5197:ffblock=0,base:5182:mask"; echo "holdre $(( $(date +%s) - t0 ))s"
