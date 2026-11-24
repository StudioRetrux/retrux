#!/bin/zsh
# G10 first-motion hitch (lane only, real loop, CDP mouse) + G6 real loop (judges' rl.mjs, medium, 180 frames)
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5c
node tools/hitch.mjs --runs "lane=5195" --reps 2 --out perf/hitch_lane.json > perf/hitch_lane.out 2>&1
node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/motion/tools/rl.mjs --port 5195 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5c/rl/aa5c_medium --path medium --frames 180 > /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5c/rl/aa5c_medium.log 2>&1
node tools/ident2.mjs --port 5195 --path medium --frames 30 --dump 29 --out ident/look_lane_med.json
node tools/ident2.mjs --port 5195 --path medium --frames 30 --dump 29 --qs "mirrorcost=0" --out ident/look_mc0_med.json
