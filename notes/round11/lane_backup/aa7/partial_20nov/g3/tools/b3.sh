#!/bin/bash
# g3 batch 3: debug renders (G3DBG build on :5198) at the gov case's pale block (k88-93, scale 0.7 from i 75)
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3/tools; t0=$(date +%s)
node dbgcap.mjs --port 5198 --path gov --ks 88,89,90,91,92,93 --modes 0,7,12,13,14 --crop 60,470,260,540 --qs "lkhalf=0" --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3/dbg/gov_h0
node dbgcap.mjs --port 5198 --path gov --ks 88,89,90,91,92,93 --modes 0,7,12,13,14 --crop 60,470,260,540 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3/dbg/gov_def
node dbgcap.mjs --port 5198 --path gov --ks 89,90,91,92,93 --modes 0,7,12,13,14 --crop 60,470,260,540 --qs "lkmscale=0.5,0.7143" --targets 0 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3/dbg/gov_msrow
echo "t $(( $(date +%s) - t0 ))s"
