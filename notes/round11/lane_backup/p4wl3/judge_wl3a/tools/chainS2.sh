#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
J=$SP/work_p4/judge_wl3a; S=$SP/slot/slot.mjs; T=$J/tools; cd $J
log() { echo "$(date +%T) $*" >> $J/run.log; }
PT=$SP/work_p4/p4rxa/tools/pop; F=$J/fair; b=L; p=reverse
until ! node $S status | grep -q 'judge_wl3a:fair-reverse-gt'; do sleep 2; done
echo "## $b $p: $(node $PT/popscan.mjs --mask $SP/work5/aa5b/caps/reverse_bmask --gt $F/${p}_${b}_gt --minpx 6 $b=$F/${p}_$b 2>&1 | grep -m3 -i 'events\|clusters\|>= 6\|total' | tr '\n' ' ' | cut -c1-260)" >> $F/fair_$b.txt
log "fair reverse done"
for r in 5162:main 5169:lane; do
  node $S run "judge_wl3a:s60" -- zsh -c "LAB=http://localhost:${r%%:*} TIER=T1 PREFIX=s CLIP=860,420,580,200 node $T/shoot_ripple.mjs s60/far_${r#*:} 40 0.0166666667 100 > s60/far_${r#*:}.log 2>&1; LAB=http://localhost:${r%%:*} TIER=T1 PREFIX=s CLIP=0,430,560,200 node $T/shoot_ripple.mjs s60/left_${r#*:} 40 0.0166666667 100 > s60/left_${r#*:}.log 2>&1"; done
log "s60 done"
for pp in 5167:wl2 5169:lane; do port=${pp%%:*}; b=${pp#*:}
  node $S run "judge_wl3a:hold" -- node $T/cap.mjs --port $port --path hold --frames 330 --pre 30 --vw 1440 --vh 766 --dsf 1 --tier T1 --rows 380,766 --out caps/hold_$b > caps/hold_$b.log 2>&1; done
log "CHAIN S2 DONE"
