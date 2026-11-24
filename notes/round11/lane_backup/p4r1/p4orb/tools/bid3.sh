#!/bin/zsh
T=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4orb/tools/identP.mjs
node $T --port 5176 --tier T1 --qs p4orb=0 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4orb/ident/F_lane0_T1.json
node $T --port 5176 --tier T2 --qs p4orb=0 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4orb/ident/F_lane0_T2.json
node $T --port 5176 --mobile --qs p4orb=0 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4orb/ident/F_lane0_T0.json
node $T --port 5176 --mobile --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4orb/ident/F_lane_T0.json
node $T --port 5176 --tier T1 --qs envlake=plate\&p4orb=0 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4orb/ident/F_lane0_plate.json
node $T --port 5176 --tier T1 --qs orbglass=r11\&shard2=r11\&orbcharge=r11 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4orb/ident/F_lanesub_T1.json
node $T --port 5176 --tier T1 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4orb/ident/F_lane_T1.json
