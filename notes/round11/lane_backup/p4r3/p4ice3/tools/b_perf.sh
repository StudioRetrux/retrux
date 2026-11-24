#!/bin/zsh
# p4ice perf A/B: lane (:5175) vs MAIN (:5197), T1 scale 1, product loop, unthrottled Chrome, interleaved AB / BA,
# 8 move + 4 rest cycles; first wait (max 240 s) for no other slot holder and a 1-min load < 10.
node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4ice/tools/waitq.mjs 10 240000
node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4ice/tools/rc2.mjs --vw 1440 --vh 766 --cycles 8 --restcycles 4 --blockms 2500 --confs "lane=5175|tier=T1&scale=1,main=5197|tier=T1&scale=1" --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4ice/perf/ab.json
