#!/bin/zsh
# fixed masks (BASE) for the G1 paths, 120 frames
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/tools
t0=$(date +%s)
for p in fast diag reverse leave; do node capm.mjs --port 5182 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/caps/${p}_mask --path $p --frames 120 --rows 380,766 --mask; echo "$p t $(( $(date +%s) - t0 ))s"; done
