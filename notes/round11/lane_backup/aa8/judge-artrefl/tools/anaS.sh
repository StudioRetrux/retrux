#!/bin/zsh
# ordinary pointer sweep (medium path, 120 frames) at render scale 0.8 / 0.7: pops A8 vs A7 (GT = scale-1 16-sample, same poses)
# and where BASE's pale block shows (A8 darker than BASE): candidate tip-spot frames
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/artrefl; T=$W/tools; C=$W/caps
M=$SP/work5/aa5b/caps/medium_bmask; G=$SP/work3/aa3/caps/medium_gt; s=$1
cd $T
{ node capcmp.mjs $C/med${s}_A8 $C/med${s}_A7 8
  node popscan.mjs --mask $M --gt $G --thr 40 --k1 120 A7=$C/med${s}_A7 A8=$C/med${s}_A8 BASE=$C/med${s}_BASE --top 4 2>&1
  echo "-- popnew A8 vs A7"; node popnew.mjs --mask $M --gt $G --k1 120 --x $C/med${s}_A8 --ref $C/med${s}_A7 --top 6
  echo "-- popnew A7 vs A8"; node popnew.mjs --mask $M --gt $G --k1 120 --x $C/med${s}_A7 --ref $C/med${s}_A8 --top 4
  echo "-- v3err A8 vs A7 thr 8 (gt none)"; node v3err.mjs --mask $M --gt none --x $C/med${s}_A8 --ref $C/med${s}_A7 --thr 8 --top 4
  echo "-- v3err A8 vs BASE thr 15 (gt none): dark = BASE's pale blocks the guard removes"; node v3err.mjs --mask $M --gt none --x $C/med${s}_A8 --ref $C/med${s}_BASE --thr 15 --top 10
} > $W/ana/sweep_s$s.txt 2>&1
echo "anaS $s done $(date +%T)"
