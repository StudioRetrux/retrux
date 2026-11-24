#!/bin/bash
# analysis of the fix-B preview (AA7 + ?lkmscale=0.5,0.5/s at fixed scale s) vs AA7 at the same scale
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; G=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3; C=$G/caps; cd $G/tools
M=$SP/work5/aa5b/caps/medium_bmask; GT=$SP/work3/aa3/caps/medium_gt
for s in 07 08 09; do
  echo "== medium scale 0.${s:1}"
  node pdiff.mjs $C/med_s${s}_a7 $C/med_s${s}_a7ms --quiet 1
  node popscan.mjs --mask $M --gt $GT --k1 120 a7=$C/med_s${s}_a7 B=$C/med_s${s}_a7ms 2>&1 | grep flagged
  echo "-- new pops of B vs AA7:"; node popnew.mjs --mask $M --gt $GT --x $C/med_s${s}_a7ms --ref $C/med_s${s}_a7 2>&1 | head -7
  echo "-- pops of AA7 that B removes:"; node popnew.mjs --mask $M --gt $GT --x $C/med_s${s}_a7 --ref $C/med_s${s}_a7ms 2>&1 | head -3
done
