#!/bin/zsh
# judge_wl3b extra real loops on a quiet machine (client regime dt ~30 ms): T1 DPR 2 left water + lip band, alternated L / M / B
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
J=$SP/work_p4/judge_wl3b; S=$SP/slot/slot.mjs; T=$J/tools; cd $J
log() { echo "$(date +%T) $*" >> $J/run.log; }
RL() { local port=$1 tag=$2 rx=$3 ry=$4 rw=$5 rh=$6 dpr=$7 qs=$8
  node $S run "judge_wl3b:rl-$tag" -- zsh -c "cd $J; node $T/rl.mjs --frames 150 --vw 1440 --vh 766 --rx $rx --ry $ry --rw $rw --rh $rh --url http://localhost:$port/ --qs 'tier=T1&scale=1$qs' --dpr $dpr --out rl/$tag > rl/$tag.txt 2>&1 & pid=\$!; for k in {1..150}; do sleep 1; grep -q 'frames' rl/$tag.txt && break; done; sleep 1; kill \$pid 2>/dev/null; true"
  log "rl $tag $(tail -1 rl/$tag.txt | cut -c1-100)"; }
for i in c d; do RL 5168 lL_$i 0 440 480 180 2; RL 5162 lM_$i 0 440 480 180 2; RL 5167 lB_$i 0 440 480 180 2; done
RL 5168 pL_b 860 420 580 180 2; RL 5162 pM_b 860 420 580 180 2; RL 5167 pB_b 860 420 580 180 2
log CHAIN2 DONE
