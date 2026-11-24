#!/bin/zsh
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4wl; mkdir -p poses
until [ -f caps/S60DONE ]; do sleep 5; done
node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/slot/slot.mjs run 'judge_p4wl:posesT2' -- zsh -c "cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4wl; LAB=http://localhost:5162 node /Users/muhamadrifaldi/RetruxR11Work/hp/validate/shoot_poses.mjs poses/main T2 1 p00_rest,p04_expand_pop,p06_sustain,p07_release_snap > poses/main.log 2>&1; LAB=http://localhost:5163 node /Users/muhamadrifaldi/RetruxR11Work/hp/validate/shoot_poses.mjs poses/lane T2 1 p00_rest,p04_expand_pop,p06_sustain,p07_release_snap > poses/lane.log 2>&1"
echo POSESDONE > poses/DONE
