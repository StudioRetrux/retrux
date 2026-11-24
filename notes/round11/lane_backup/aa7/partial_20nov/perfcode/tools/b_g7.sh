#!/bin/zsh
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/perfcode
node tools/waitquiet.mjs 7 240000
uptime
SLOT_BG=0 node tools/rtx.mjs --vw 1440 --vh 766 --cycles 8 --restcycles 8 --blockms 2500 --out perf/rtx_1440.json > perf/rtx_1440.out 2>&1
uptime
