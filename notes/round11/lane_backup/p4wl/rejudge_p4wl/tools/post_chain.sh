#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
J=$SP/work_p4/judge_p4wl; R=$SP/work_p4/rejudge_p4wl; S=$SP/slot/slot.mjs; BPY=/Applications/Blender.app/Contents/Resources/5.2/python/bin/python3.13
until [ -f $R/perf/DONE ]; do sleep 3; done
node $S run 'rejudge_p4wl:bisect' -- zsh -c "cd $J
node tools/pop/cap.mjs --port 5163 --tier T1 --path fast --rows 380,766 --frames 106 --qs wlwalk=px --out $R/fair/fast_Lpx > $R/fair/fast_Lpx.log 2>&1
node tools/pop/cap.mjs --port 5163 --tier T1 --path fast --rows 380,766 --frames 106 --qs lkhalf=0 --out $R/fair/fast_Lh0 > $R/fair/fast_Lh0.log 2>&1"
echo BISECTDONE >> $R/fair/run.log
for q in 5162:main 5163:lane; do port=${q%%:*}; b=${q#*:}
  node $S run "rejudge_p4wl:s60-$b" -- zsh -c "cd $J; LAB=http://localhost:$port TIER=T1 CLIP=860,420,580,200 PREFIX=s node tools/shoot_ripple.mjs $R/s60/far_$b 40 0.0166666667 100 > $R/s60/far_$b.log 2>&1; LAB=http://localhost:$port TIER=T1 DPR=2 CLIP=860,420,580,200 PREFIX=s node tools/shoot_ripple.mjs $R/s60/far_${b}_2x 40 0.0166666667 100 > $R/s60/far_${b}_2x.log 2>&1"
  $BPY -I $J/tools/down2.py $R/s60/far_${b}_2x $R/s60/far_${b}_gt && rm -rf $R/s60/far_${b}_2x
done
cd $J; $BPY -I tools/s60far.py tools $R/s60/far_main $R/s60/far_main_gt $R/s60/far_lane $R/s60/far_lane_gt > $R/s60/s60_far.txt 2>&1
echo S60DONE >> $R/s60/s60_far.txt
