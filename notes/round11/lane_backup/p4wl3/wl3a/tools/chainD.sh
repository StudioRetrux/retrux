#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
W=$SP/work_p4/wl3a; S=$SP/slot/slot.mjs; T=$W/tools; cd $W; mkdir -p s60 caps
for r in 5162:main 5167:wl2 5169:lane; do
  node $S run "wl3a:s60" -- zsh -c "LAB=http://localhost:${r%%:*} TIER=T1 PREFIX=s CLIP=860,420,580,200 node $T/shoot_ripple.mjs s60/far_${r#*:} 40 0.0166666667 100 > s60/far_${r#*:}.log 2>&1; LAB=http://localhost:${r%%:*} TIER=T1 PREFIX=s CLIP=0,430,560,200 node $T/shoot_ripple.mjs s60/left_${r#*:} 40 0.0166666667 100 > s60/left_${r#*:}.log 2>&1"; done
for t in T1 T2; do for pp in 5162:main 5167:wl2 5169:lane; do port=${pp%%:*}; b=${pp#*:}
  node $S run "wl3a:rest" -- node $T/cap.mjs --port $port --path rest --frames 3 --pre 5 --vw 1440 --vh 766 --dsf 1 --tier $t --out caps/rest_${t}_$b > caps/rest_${t}_$b.log 2>&1; done; done
echo "$(date +%T) CHAIN D DONE" >> $W/gates.log
