#!/bin/zsh
# judge_wl2 chain 3: CLEAN re-run of the deciding test (T1 DPR 2 real loop, M W M W) with nothing else of mine running
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
J=$SP/work_p4/judge_wl2; S=$SP/slot/slot.mjs; T=$J/tools; cd $J
log() { echo "$(date +%T) $*" >> $J/run.log; }
until grep -q 'CHAIN2 DONE' $J/run.log; do sleep 3; done
log "rl3 clean start (no analysis running)"
for r in 5162:main_d 5167:wl2_d 5162:main_e 5167:wl2_e; do
  node $S run "judge_wl2:rl-${r#*:}" -- zsh -c "cd $J; node $T/rl.mjs --frames 150 --rx 0 --ry 440 --rw 480 --rh 180 --url http://localhost:${r%%:*}/ --qs 'tier=T1&scale=1' --dpr 2 --out rl/T1d2_${r#*:} > rl/rl_${r#*:}.txt 2>&1 & pid=\$!; for k in {1..150}; do sleep 1; grep -q 'frames' rl/rl_${r#*:}.txt && break; done; sleep 1; kill \$pid 2>/dev/null; true"
  log "rl3 ${r#*:} $(tail -1 rl/rl_${r#*:}.txt | cut -c1-120)"; done
log CHAIN3 DONE
