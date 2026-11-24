#!/bin/bash
# batch D1 (trimmed 18:16 for time): hold AA6, full frame (no hold mask: v3 only touches the water; A6 vs A6f0 diff needs none)
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/refl/tools; t0=$(date +%s)
node cap.mjs --port 5196 --path hold --frames 420 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/refl/caps/hold_A6; echo "t $(( $(date +%s) - t0 ))s"
