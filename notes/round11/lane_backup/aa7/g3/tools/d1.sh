#!/bin/bash
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3/tools; t0=$(date +%s)
node dbgcap.mjs --port 5199 --path medium --scale 0.7 --ks 82,83,84,109,110 --modes 0,12,13 --crop 140,528,200,552 --qs "lkhalf=0" --targets 0 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3/dbg/med07_r2
node dbgcap.mjs --port 5199 --path gov --ks 90,91,92 --modes 0,12,13 --crop 60,470,260,540 --qs "lkhalf=0" --targets 0 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3/dbg/gov_fix
echo "d1 $(( $(date +%s) - t0 ))s"
