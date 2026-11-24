#!/bin/zsh
# p4ice perf A/B run 2: as run 1 with 12 move cycles (run 1 had only 4 pairs under load 10); wait max 300 s for quiet (load < 8).
node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4ice/tools/waitq.mjs 8 300000
node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4ice/tools/rc2.mjs --vw 1440 --vh 766 --cycles 12 --restcycles 4 --blockms 2500 --confs "lane=5175|tier=T1&scale=1,main=5197|tier=T1&scale=1" --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4ice/perf/ab_run2.json
