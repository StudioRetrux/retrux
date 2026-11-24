#!/bin/zsh
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/tip/tools; t0=$(date +%s)
node dbgj.mjs --case gov --noscale --port 5198 --qs "lkhalf=0&lktaa=0&tipdbg=1" --ks 70 --crop 40,470,360,540 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/tip/dbg/gov1m ; echo "gov1 $(( $(date +%s) - t0 ))s"
node dbgj.mjs --case holdre --port 5198 --qs "lkhalf=0&lktaa=0&tipdbg=1" --ks 207 --crop 40,570,360,640 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/tip/dbg/holdrem ; echo "holdre $(( $(date +%s) - t0 ))s"
