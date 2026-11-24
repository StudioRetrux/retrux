#!/bin/bash
# batch D2 (trimmed): hold ?ffblock=0 (v3 off), full frame
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/refl/tools; t0=$(date +%s)
node cap.mjs --port 5196 --path hold --frames 420 --qs "ffblock=0" --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/refl/caps/hold_A6f0; echo "t $(( $(date +%s) - t0 ))s"
