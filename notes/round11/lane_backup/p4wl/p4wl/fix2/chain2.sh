#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4wl; J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4wl; S=$SP/slot/slot.mjs; G=$SP/work_p4/gt_new/tools; BPY=/Applications/Blender.app/Contents/Resources/5.2/python/bin/python3.13
F=$W/fix2/fair
until grep -q CHAINDONE $W/fix2/rl/run.log 2>/dev/null; do sleep 5; done
cd $W
node $S run 'p4wl:rest' -- zsh -c "cd $W; for t in T1 T2; do for q in 5162:main 5163:lane; do node tools/cap.mjs --port \${q%%:*} --path rest --frames 3 --pre 5 --vw 1440 --vh 766 --dsf 1 --tier \$t --out fix2/rest/\${t}_\${q#*:} | tail -1; done; done" > $W/fix2/rest/log.txt 2>&1
for p in fast reverse; do n=240; [ $p = fast ] && n=120
 for q in 5162:M 5163:L; do port=${q%%:*}; b=${q#*:}
  node $S run "p4wl:fair-$p-$b" -- zsh -c "cd $J; node tools/pop/cap.mjs --port $port --tier T1 --path $p --rows 380,766 --frames 240 --out $F/${p}_$b > $F/${p}_$b.log 2>&1; cd $G; node cap.mjs --port $port --tier T1 --path $p --frames $n --vw 2880 --vh 1532 --rows 380,766,766 --qs lkmeach=1 --out $F/${p}_${b}_gt2x > $F/${p}_${b}_gt.log 2>&1 && node down2.mjs $F/${p}_${b}_gt2x $F/${p}_${b}_gt && rm -rf $F/${p}_${b}_gt2x"
  echo "$(date +%T) fair $p $b" >> $F/run.log
 done
done
echo FAIRDONE >> $F/run.log
for q in 5162:main 5163:lane; do port=${q%%:*}; b=${q#*:}
  node $S run "p4wl:s60-$b" -- zsh -c "cd $J; LAB=http://localhost:$port TIER=T1 CLIP=860,420,580,200 PREFIX=s node tools/shoot_ripple.mjs $W/fix2/s60/far_$b 40 0.0166666667 100 > $W/fix2/s60/far_$b.log 2>&1; LAB=http://localhost:$port TIER=T1 DPR=2 CLIP=860,420,580,200 PREFIX=s node tools/shoot_ripple.mjs $W/fix2/s60/far_${b}_2x 40 0.0166666667 100 > $W/fix2/s60/far_${b}_2x.log 2>&1"
  $BPY -I $J/tools/down2.py $W/fix2/s60/far_${b}_2x $W/fix2/s60/far_${b}_gt && rm -rf $W/fix2/s60/far_${b}_2x
done
cd $J; $BPY -I tools/s60far.py tools $W/fix2/s60/far_main $W/fix2/s60/far_main_gt $W/fix2/s60/far_lane $W/fix2/s60/far_lane_gt > $W/fix2/s60/s60_far.txt 2>&1
echo CHAIN2DONE >> $F/run.log
