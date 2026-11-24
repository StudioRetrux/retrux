#!/bin/zsh
# wl2 post analysis: $1 = st | rest
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
W=$SP/work_p4/wl2; G=$SP/work_p4/wl2g; T=$W/tools; BPY=/Applications/Blender.app/Contents/Resources/5.2/python/bin/python3.13; FF=/opt/homebrew/bin/ffmpeg; cd $W
if [ "$1" = st ]; then
  for p in d1:d1_G4 d2:d2_G4; do a=${p%%:*}; b=${p#*:}; n=0; d=0
    for f in $G/st/$b/f*.bin; do n=$((n+1)); cmp -s $f st/${a}_W/${f:t} || d=$((d+1)); done
    cmp -s $G/st/$b/meta.json st/${a}_W/meta.json && mj=same || mj=differs
    echo "${a}_W vs wl2g $b: $n frames, $d differ (meta.json $mj)"; done > st/bytecmp.txt
  for d in d1_M d1_L d1_PX d1_gtpx d2_M d2_L d2_PX gtpx2x; do ln -sfn $G/st/$d st/$d; done
  $BPY -I $T/stan.py $T $W/st 1 $W/st/d1 d1_M d1_L d1_W d1_PX d1_gtpx > st/d1_blips.txt 2>&1
  $BPY -I $T/stan.py $T $W/st 2 $W/st/d2 d2_M d2_L d2_W d2_PX gtpx2x > st/d2_blips.txt 2>&1
  $BPY -I $T/client.py $T st/d1_M st/d1_W 0,430,560,620 98,99,100,101 1 client/c1x.png
  $BPY -I $T/client.py $T st/d1_M st/d1_W 260,440,500,530 98,99,100,101 2 client/c2x.png
  $BPY -I $T/mkvid.py $T st/d2_M st/d2_W 0 430 560 613 client/seq 1
  $FF -y -v error -i client/c1x.png -q:v 2 client/wl2_merged_1x_MAIN_MERGED.jpg
  $FF -y -v error -i client/c2x.png -q:v 2 client/wl2_merged_2x_MAIN_MERGED.jpg
  $FF -y -v error -framerate 30 -i client/seq/f%04d.png -c:v libx264 -pix_fmt yuv420p -crf 16 client/wl2_merged_T1dpr2_MAIN_left_MERGED_right_halfspeed.mp4
  echo POSTST_DONE >> st/bytecmp.txt
fi
if [ "$1" = rest ]; then
  for t in T1 T2; do $BPY -I $T/slabcrop.py $T caps/rest_${t}_wl2 caps/rest_${t}_main client/slab_$t; done
  for t in T1 T2; do for n in far left; do for z in 1x 2x; do $FF -y -v error -i client/slab_${t}_${n}_$z.png -q:v 2 client/wl2_merged_slabs_${t}_${n}_${z}_REF_MERGED_MAIN.jpg; done; done; done
  echo POSTREST_DONE
fi
