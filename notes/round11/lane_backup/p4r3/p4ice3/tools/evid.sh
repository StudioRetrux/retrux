#!/bin/zsh
# evidence crops: MAIN (panel set) | lane (qc_final) | REF where the pose matches; nearest-neighbour zoom
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
W=$SP/work_p4/p4ice; M=$SP/p3/r11_1; Q=$W/qc_final; R=/Users/muhamadrifaldi/RetruxR11Work/hp/reference; FF=/opt/homebrew/bin/ffmpeg; O=$W/img/final; mkdir -p $O
z() { # name file crop(w:h:x:y) scale
  $FF -y -loglevel error -i $M/$2 -i $Q/$2 -filter_complex "[0]crop=$3,scale=iw*$4:ih*$4:flags=neighbor[a];[1]crop=$3,scale=iw*$4:ih*$4:flags=neighbor[b];[a][b]hstack" $O/$1.png; }
z p05_toparc p05_expand.png 200:80:650:60 3
z p05_rightarc p05_expand.png 170:380:890:160 2
z sw_hold_T sweep/sw_hold_T.png 120:110:960:310 3
z sw_pop_B sweep/sw_pop_B.png 80:90:840:195 4
z sw_hold_BL sweep/sw_hold_BL.png 300:240:300:300 2
z q03_outerR q03_eye.png 60:110:790:250 4
z q00_low q00_rest.png 160:60:640:475 3
for p in q00_rest q01_loop15 q02_loop30 q03_eye p04_expand_pop p05_expand p06_sustain p07_release_snap; do
  $FF -y -loglevel error -i $M/$p.png -i $Q/$p.png -filter_complex "[0]scale=720:383[a];[1]scale=720:383[b];[a][b]hstack" $O/ml_$p.png; done
echo crops done
