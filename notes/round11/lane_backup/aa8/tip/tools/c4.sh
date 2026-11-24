#!/bin/zsh
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/tip/tools; t0=$(date +%s)
node glide/jcapS1.mjs --case gov --noscale --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/tip/caps/gov1 --rows 380,766 --variants "r2:5198:fftip=0:lkmscale=0.5%2C1" ; echo "gov1 $(( $(date +%s) - t0 ))s"
node glide/jcap.mjs --case holdre --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/tip/caps/holdre --rows 560,660 --variants "vA:5198,r2:5198:fftip=0:lkmscale=0.5%2C1" ; echo "holdre $(( $(date +%s) - t0 ))s"
