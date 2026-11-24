#!/bin/zsh
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4hold
cd $J
node tools/shoot_pop30.mjs 5199 caps/pop30_main
node tools/shoot_pop30.mjs 5178 caps/pop30_lane
echo E done
