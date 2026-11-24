#!/bin/bash
# batch B1: fast + diag (120 frames, aa5a's clean masks) x 3 variants; leave clean mask on BASE (240)
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/refl/tools; t0=$(date +%s)
for p in fast diag; do
  node cap.mjs --port 5196 --path $p --frames 120 --rows 380,766 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/refl/caps/${p}_A6
  node cap.mjs --port 5196 --path $p --frames 120 --rows 380,766 --qs "ffblock=0" --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/refl/caps/${p}_A6f0
  node cap.mjs --port 5196 --path $p --frames 120 --rows 380,766 --qs "lkglide=0&ffblock=0" --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/refl/caps/${p}_FIX1
  echo "t $(( $(date +%s) - t0 ))s"
done
node cap.mjs --port 5182 --path leave --rows 380,766 --mask --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/refl/caps/leave_bmask; echo "t $(( $(date +%s) - t0 ))s"
