#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
W=$SP/work_p4/wl3b; T=$W/tools; BPY=/Applications/Blender.app/Contents/Resources/5.2/python/bin/python3.13; FF=/opt/homebrew/bin/ffmpeg; cd $W
until grep -q "st/rest/s60 done" run.log; do sleep 3; done
mkdir -p client
# rest crops REF | MAIN | lane, T1 + T2
for t in T1 T2; do $BPY -I $T/slabcrop3.py $T caps/rest_${t}_main caps/rest_${t}_fin client/slab_$t; done
for t in T1 T2; do for n in far left; do for z in 1x 2x; do $FF -y -v error -i client/slab_${t}_${n}_$z.png -q:v 2 client/wl3_wl3b_rest_${t}_${n}_${z}_REF_MAIN_LANE.jpg; done; done; done
# numbers at rest (final build)
$BPY -I $T/cols.py $T 900 1440 498 600 6 caps/rest_T1_main caps/rest_T1_wl2 caps/rest_T1_fin caps/rest_T2_main caps/rest_T2_wl2 caps/rest_T2_fin > cols_final.txt 2>&1
$BPY -I $T/colmatch.py $T $W T1_main T1_wl2 T1_fin > colmatch_final.txt 2>&1
$BPY -I $T/brk.py $T $W T1_main T1_wl2 T1_fin > brk_final.txt 2>&1
# stepped finals: blips vs GT, DPR 2 and DPR 1
$BPY -I $T/lipan.py $T st M=FM:FGT B=FB:FGT L=FL:FGT GT=FGT GTpx=FGTpx > st_final_d2.txt 2>&1
$BPY -I $T/lipan.py $T st M=D1M B=D1B L=D1L > st_final_d1.txt 2>&1
$BPY -I $T/lipan.py $T s60 M=M B=B L=L > s60_final.txt 2>&1
# lip sheets 4x (same pose, frames 60-63) MAIN | wl2 | lane | GT (per-pixel walk + lkmeach, 2x supersampled)
$BPY -I $T/lipsheet.py $T st 1300,475,1420,525 30,31,32,33 4 img/lips4x_R_M_B_L_GT.png FM FB FL FGTpx
$BPY -I $T/lipsheet.py $T st 1090,470,1210,520 30,31,32,33 4 img/lips4x_M_M_B_L_GT.png FM FB FL FGTpx
$BPY -I $T/lipsheet.py $T st 880,470,1000,520 30,31,32,33 4 img/lips4x_L_M_B_L_GT.png FM FB FL FGTpx
# motion: mp4 MAIN left | lane right, far slabs, T1 DPR 2 (stepped fast path, 120 frames at 30 fps = half speed)
$BPY -I $T/mkvid.py $T st/FM st/FL 860 430 1440 600 client/seq 1
$FF -y -v error -framerate 30 -i client/seq/f%04d.png -c:v libx264 -pix_fmt yuv420p -crf 16 client/wl3_wl3b_far_T1dpr2_MAIN_left_LANE_right_halfspeed.mp4
$BPY -I $T/lipsheet.py $T st 860,440,1440,600 40,41,42 1 client/strip.png FM FL
$FF -y -v error -i client/strip.png -q:v 2 client/wl3_wl3b_far_T1dpr2_motion_strip_MAIN_LANE.jpg
$BPY -I $T/lipsheet.py $T st 0,470,480,620 40,41,42 1 client/strip_left.png FM FB FL
$FF -y -v error -i client/strip_left.png -q:v 2 client/wl3_wl3b_left_T1dpr2_motion_strip_MAIN_WL2_LANE.jpg
rm -rf client/seq
echo "$(date +%T) POST DONE" >> run.log
