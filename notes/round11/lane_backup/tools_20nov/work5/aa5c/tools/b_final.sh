#!/bin/zsh
# final batch (~5 min): real-loop perf 1440 / 1920 (3 configs), first-motion hitch, real-loop G6 capture, look dumps
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5c
node tools/rtpin2.mjs --port 5195 --vw 1440 --vh 766 --cycles 6 --blockms 2200 --out perf/rt_1440.json > perf/rt_1440.out 2>&1
node tools/rtpin2.mjs --port 5195 --vw 1920 --vh 1080 --cycles 4 --blockms 2200 --out perf/rt_1920.json > perf/rt_1920.out 2>&1
node tools/hitch.mjs --runs "lane=5195" --reps 1 --out perf/hitch_lane.json > perf/hitch_lane.out 2>&1
node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/motion/tools/rl.mjs --port 5195 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5c/rl/aa5c_medium --path medium --frames 180 > /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5c/rl/aa5c_medium.log 2>&1
node tools/ident2.mjs --port 5195 --path medium --frames 30 --dump 29 --out ident/look_lane_med.json
node tools/ident2.mjs --port 5195 --path medium --frames 30 --dump 29 --qs "mirrorcost=0" --out ident/look_mc0_med.json
