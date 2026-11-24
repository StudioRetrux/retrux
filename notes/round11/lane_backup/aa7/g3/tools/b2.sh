#!/bin/bash
# g3 batch 2: medium at fixed render scale 0.7 (a7, f0, base), rows 380-766, 120 frames
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3/tools; t0=$(date +%s)
node cap.mjs --port 5197 --path medium --rows 380,766 --frames 120 --scale 0.7 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3/caps/medium_s07_a7
node cap.mjs --port 5197 --path medium --rows 380,766 --frames 120 --scale 0.7 --qs "ffblock=0" --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3/caps/medium_s07_f0
node cap.mjs --port 5182 --path medium --rows 380,766 --frames 120 --scale 0.7 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3/caps/medium_s07_base
echo "t $(( $(date +%s) - t0 ))s"
