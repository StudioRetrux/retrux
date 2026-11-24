#!/bin/zsh
# fixer batch 9: G10 on the final AA6 (aa5a's g10.mjs: DPR 1 / 2, resize, live engine with real mouse + hold, console)
F=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/fix; t0=$(date +%s)
node $F/tools/integ/aa5a/g10.mjs --port 5196 > $F/ana/g10.txt 2>&1
echo "b9 $(( $(date +%s) - t0 ))s"
