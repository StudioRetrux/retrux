#!/bin/zsh
# judge_wl2 chain 2: real loop T1 DPR 1 and T2 DPR 2 (MAIN, wl2, alternated), after chain 1
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
J=$SP/work_p4/judge_wl2; S=$SP/slot/slot.mjs; T=$J/tools; cd $J
log() { echo "$(date +%T) $*" >> $J/run.log; }
until grep -q 'CHAIN DONE' $J/run.log; do sleep 3; done
for r in "5162:d1main_a:1:T1" "5167:d1wl2_a:1:T1" "5162:d1main_b:1:T1" "5167:d1wl2_b:1:T1" "5162:t2main_a:2:T2" "5167:t2wl2_a:2:T2"; do
  port=${r%%:*}; rest=${r#*:}; tag=${rest%%:*}; rest=${rest#*:}; dpr=${rest%%:*}; tier=${rest#*:}
  node $S run "judge_wl2:rl-$tag" -- zsh -c "cd $J; node $T/rl.mjs --frames 150 --rx 0 --ry 440 --rw 480 --rh 180 --url http://localhost:$port/ --qs 'tier=$tier&scale=1' --dpr $dpr --out rl/T1d2_$tag > rl/rl_$tag.txt 2>&1 & pid=\$!; for k in {1..150}; do sleep 1; grep -q 'frames' rl/rl_$tag.txt && break; done; sleep 1; kill \$pid 2>/dev/null; true"
  log "rl2 $tag $(tail -1 rl/rl_$tag.txt | cut -c1-140)"; done
log CHAIN2 DONE
