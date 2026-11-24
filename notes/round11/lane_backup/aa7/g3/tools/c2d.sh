#!/bin/bash
# reference: AA7 at the reduced scale with the FULL-SCALE mirror row count (?lkmscale=0.5,0.5/s): the guard with fine rows
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3/tools; t0=$(date +%s)
node cap.mjs --port 5197 --path medium --rows 380,766 --frames 120 --scale 0.7 --qs "lkmscale=0.5,0.7143" --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3/caps/med_s07_a7ms
node cap.mjs --port 5197 --path medium --rows 380,766 --frames 120 --scale 0.8 --qs "lkmscale=0.5,0.625" --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3/caps/med_s08_a7ms
node cap.mjs --port 5197 --path medium --rows 380,766 --frames 120 --scale 0.9 --qs "lkmscale=0.5,0.5556" --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3/caps/med_s09_a7ms
node jcap.mjs --case gov --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3/caps/govms --rows 440,620 --variants "a7ms07:5197:lkmscale=0.5,0.7143"
echo "c2d $(( $(date +%s) - t0 ))s"
