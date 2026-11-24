#!/bin/bash
# AA6 final (:5196) slow / medium / reverse
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/artrefl/tools; t0=$(date +%s)
for p in slow medium reverse; do node cap.mjs --port 5196 --path $p --rows 380,766 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/artrefl/caps/${p}_A6; echo "$p t $(( $(date +%s) - t0 ))s"; done
