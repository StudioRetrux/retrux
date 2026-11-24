#!/bin/bash
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3/tools; t0=$(date +%s)
node cap.mjs --port 5197 --path medium --rows 380,766 --frames 120 --scale 0.8  --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3/caps/med_s08_a7
node cap.mjs --port 5198 --path medium --rows 380,766 --frames 120 --scale 0.8  --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3/caps/med_s08_g3
node cap.mjs --port 5197 --path medium --rows 380,766 --frames 120 --scale 0.9  --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3/caps/med_s09_a7
node cap.mjs --port 5198 --path medium --rows 380,766 --frames 120 --scale 0.9  --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3/caps/med_s09_g3
echo "c2b $(( $(date +%s) - t0 ))s"
