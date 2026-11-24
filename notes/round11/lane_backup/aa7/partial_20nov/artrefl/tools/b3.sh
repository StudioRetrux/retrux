#!/bin/bash
# AA7 fast / diag (120), leave (240), rest (40)
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/artrefl/tools; t0=$(date +%s)
for p in fast diag; do node cap.mjs --port 5197 --path $p --frames 120 --rows 380,766 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/artrefl/caps/${p}_A7; echo "$p t $(( $(date +%s) - t0 ))s"; done
node cap.mjs --port 5197 --path leave --rows 380,766 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/artrefl/caps/leave_A7; echo "leave t $(( $(date +%s) - t0 ))s"
node cap.mjs --port 5197 --path rest --frames 40 --rows 380,766 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/artrefl/caps/rest_A7; echo "rest t $(( $(date +%s) - t0 ))s"
