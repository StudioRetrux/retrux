#!/bin/bash
# prejudge-refl batch A: slow + reverse on AA6 (:5196) default / ?ffblock=0 (fixed1+F1) / ?lkglide=0&ffblock=0 (fixed1)
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/refl/tools; t0=$(date +%s)
for p in slow reverse; do
  node cap.mjs --port 5196 --path $p --rows 380,766 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/refl/caps/${p}_A6
  node cap.mjs --port 5196 --path $p --rows 380,766 --qs "ffblock=0" --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/refl/caps/${p}_A6f0
  node cap.mjs --port 5196 --path $p --rows 380,766 --qs "lkglide=0&ffblock=0" --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/refl/caps/${p}_FIX1
  echo "t $(( $(date +%s) - t0 ))s"
done
