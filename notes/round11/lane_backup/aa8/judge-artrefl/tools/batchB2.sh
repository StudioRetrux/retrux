#!/bin/bash
# batch B2: leave x3 (240), rest x2 + rest knee 0.75 / 1.0, rest clean mask on BASE, medium knee 0.75 / 1.0
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/refl/tools; t0=$(date +%s)
node cap.mjs --port 5196 --path leave --rows 380,766 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/refl/caps/leave_A6
node cap.mjs --port 5196 --path leave --rows 380,766 --qs "ffblock=0" --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/refl/caps/leave_A6f0
node cap.mjs --port 5196 --path leave --rows 380,766 --qs "lkglide=0&ffblock=0" --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/refl/caps/leave_FIX1
echo "t $(( $(date +%s) - t0 ))s"
node cap.mjs --port 5196 --path rest --frames 40 --rows 380,766 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/refl/caps/rest_A6
node cap.mjs --port 5196 --path rest --frames 40 --rows 380,766 --qs "ffblock=0" --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/refl/caps/rest_A6f0
node cap.mjs --port 5196 --path rest --frames 40 --rows 380,766 --qs "lkglide=0&ffblock=0" --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/refl/caps/rest_FIX1
node cap.mjs --port 5182 --path rest --frames 40 --rows 380,766 --mask --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/refl/caps/rest_bmask
node cap.mjs --port 5196 --path rest --frames 40 --rows 380,766 --eval "window.__hero.pipeline.aa.read.uAAKnee.value = 0.75" --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/refl/caps/rest_K075
node cap.mjs --port 5196 --path rest --frames 40 --rows 380,766 --eval "window.__hero.pipeline.aa.read.uAAKnee.value = 1.0" --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/refl/caps/rest_K100
echo "t $(( $(date +%s) - t0 ))s"
node cap.mjs --port 5196 --path medium --rows 380,766 --eval "window.__hero.pipeline.aa.read.uAAKnee.value = 0.75" --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/refl/caps/medium_K075
node cap.mjs --port 5196 --path medium --rows 380,766 --eval "window.__hero.pipeline.aa.read.uAAKnee.value = 1.0" --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/refl/caps/medium_K100
echo "t $(( $(date +%s) - t0 ))s"
