#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
W=$SP/work_p4/wl2g; S=$SP/slot/slot.mjs; O=$W/s60; BPY=/Applications/Blender.app/Contents/Resources/5.2/python/bin/python3.13; cd $W
R() { node $S run "wl2g:s60-$1" -- zsh -c "LAB=http://localhost:$2 TIER=T1 ${4:+DPR=$4} CLIP=$3 PREFIX=s node tools/shoot_ripple.mjs $O/$1 40 0.0166666667 100 > $O/$1.log 2>&1"; }
R far_lane 5164 860,420,580,200; R far_lane_2x 5164 860,420,580,200 2
R left_lane 5164 0,430,560,200; R left_lane_2x 5164 0,430,560,200 2; R left_main 5162 0,430,560,200; R left_p4wl 5163 0,430,560,200
$BPY -I tools/down2.py $O/far_lane_2x $O/far_lane_gt; $BPY -I tools/down2.py $O/left_lane_2x $O/left_lane_gt
{ $BPY -I tools/s60far.py tools $O/far_lane $O/far_lane_gt; $BPY -I tools/s60left.py tools $O/left_main $O/left_p4wl $O/left_lane $O/left_lane_gt; } > $O/s60.txt 2>&1
echo S60DONE >> $O/s60.txt
