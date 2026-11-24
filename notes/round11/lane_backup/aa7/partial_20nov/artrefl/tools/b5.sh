#!/bin/bash
# AA7 hold (420, rows 380-766); jcap gov (a7 / a6 / base+mask, rows 380-766); G5 full-frame: rest 12 + medium 60 on A7
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/artrefl/tools; t0=$(date +%s)
node cap.mjs --port 5197 --path hold --frames 420 --rows 380,766 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/artrefl/caps/hold_A7; echo "hold t $(( $(date +%s) - t0 ))s"
node glide/jcap.mjs --case gov --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/artrefl/caps/gov --rows 380,766 --variants "a7:5197,a6:5196,base:5182:mask"; echo "gov t $(( $(date +%s) - t0 ))s"
node cap.mjs --port 5197 --path medium --frames 60 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/artrefl/caps/medfull_A7; echo "medfull t $(( $(date +%s) - t0 ))s"
node cap.mjs --port 5197 --path rest --frames 12 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/artrefl/caps/restfull_A7; echo "restfull t $(( $(date +%s) - t0 ))s"
