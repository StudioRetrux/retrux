#!/bin/zsh
# rejudge_wl2 chain 2 (after chain 1): stepped same-pose d2 / d1 of :5167 (vs judge_wl2's MAIN / p4wl / pre-fix / px / GT sets), far real loop T1 DPR 2
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
J=$SP/work_p4/rejudge_wl2; S=$SP/slot/slot.mjs; T=$J/tools; cd $J
log() { echo "$(date +%T) $*" >> $J/run.log; }
until grep -q 'CHAIN DONE' $J/run.log; do sleep 3; done
C() { local tag=$1; shift; node $S run "rejudge_wl2:st-$tag" -- node $T/cap.mjs --tier T1 --path fast --frames 120 "$@" --out st/$tag > st/$tag.log 2>&1; log "st $tag $(tail -1 st/$tag.log | cut -c1-90)"; }
C d2_W --port 5167 --rows 380,766 --dsf 2
C d1_W --port 5167 --rows 380,766
for r in 5162:fmain_a 5167:fwl2_a 5162:fmain_b 5167:fwl2_b; do
  node $S run "rejudge_wl2:rlfar-${r#*:}" -- zsh -c "cd $J; node $T/rl.mjs --frames 100 --vw 1440 --vh 766 --rx 860 --ry 420 --rw 580 --rh 180 --url http://localhost:${r%%:*}/ --qs 'tier=T1&scale=1' --dpr 2 --out rl/T1d2_${r#*:} > rl/rl_${r#*:}.txt 2>&1 & pid=\$!; for k in {1..150}; do sleep 1; grep -q 'frames' rl/rl_${r#*:}.txt && break; done; sleep 1; kill \$pid 2>/dev/null; true"
  log "rlfar ${r#*:} $(tail -1 rl/rl_${r#*:}.txt | cut -c1-120)"; done
log "CHAIN2 DONE"
