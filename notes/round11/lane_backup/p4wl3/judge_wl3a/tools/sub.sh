#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
J=$SP/work_p4/judge_wl3a; S=$SP/slot/slot.mjs; T=$J/tools; cd $J
until grep -q "rl a2_L3" $J/run.log; do sleep 2; done
for v in w0:wl3aw=0 e0:wl3ae=0 s0:wl3as=0; do tag=${v%%:*}; qs=${v#*:}
  node $S run "judge_wl3a:rest-sub" -- node $T/cap.mjs --port 5169 --qs "$qs" --path rest --frames 3 --pre 5 --vw 1440 --vh 766 --dsf 1 --tier T1 --out caps/rest_T1_lane_$tag > caps/rest_T1_lane_$tag.log 2>&1; done
echo "$(date +%T) sub rest done" >> $J/run.log
