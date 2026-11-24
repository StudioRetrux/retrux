#!/bin/zsh
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/tip/tools; t0=$(date +%s)
node glide/jcapS1.mjs --case gov --noscale --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/tip/caps/gov1 --rows 380,766 --variants "vA:5198,vB:5198:fftipg=0.5,vC:5198:fftipl=0.4,vD:5198:fftipg=0.5:fftipl=0.4:fftipw=0.4" ; echo "gov1 $(( $(date +%s) - t0 ))s"
