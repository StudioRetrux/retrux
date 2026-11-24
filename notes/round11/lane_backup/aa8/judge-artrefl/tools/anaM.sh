#!/bin/zsh
# AA8 vs AA7: rest (v3err, jgt2, kerr), knee medium (jgt2, kerr), hold (BASE ref), holdre / gov (jcap, BASE in-session ref)
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/artrefl; T=$W/tools; C=$W/caps; A=$W/ana
cd $T
case $1 in
rest)
  M=$SP/work6/refl/caps/rest_bmask; G=$SP/work5/aa5b/caps/rest_gt
  { node capcmp.mjs $C/rest_A8 $C/rest_A7 8
    echo "-- v3err A8 vs A7 thr 8"; node v3err.mjs --mask $M --gt $G --x $C/rest_A8 --ref $C/rest_A7 --thr 8 --top 6
    echo "-- v3err A8 vs A7 thr 16"; node v3err.mjs --mask $M --gt $G --x $C/rest_A8 --ref $C/rest_A7 --thr 16 --top 4
    echo "-- jgt2 rest"; for v in A8 A7; do echo "$v $(node jgt2.mjs $M $C/rest_$v $G 0 40)"; done
    echo "-- kerr rest"; node kerr.mjs $M $G 0 40 A7=$C/rest_A7 A8=$C/rest_A8
  } > $A/rest.txt 2>&1 ;;
knee)
  M=$SP/work5/aa5b/caps/medium_bmask; G=$SP/work3/aa3/caps/medium_gt
  { echo "-- jgt2 medium"; for v in A8=$C/medium_A8 A7=$SP/work7/motion/caps/medium_A7; do echo "${v%%=*} $(node jgt2.mjs $M ${v#*=} $G 0 240)"; done
    echo "-- kerr medium"; node kerr.mjs $M $G 0 240 A7=$SP/work7/motion/caps/medium_A7 A8=$C/medium_A8
  } > $A/knee_medium.txt 2>&1 ;;
hold)
  B=$SP/work3/aa3/caps/hold_base
  { node capcmp.mjs $C/hold_A8 $C/hold_A7 8
    node popscan.mjs --mask $B --gt $B --thr 40 --json $A/popscan_hold.json A7=$C/hold_A7 A8=$C/hold_A8 --top 6 2>&1
    echo "-- popnew A8 vs A7"; node popnew.mjs --mask $B --gt $B --x $C/hold_A8 --ref $C/hold_A7 --top 8
    echo "-- popnew A7 vs A8"; node popnew.mjs --mask $B --gt $B --x $C/hold_A7 --ref $C/hold_A8 --top 4
    echo "-- v3err A8 vs A7 thr 8 (gt none)"; node v3err.mjs --mask $B --gt none --x $C/hold_A8 --ref $C/hold_A7 --thr 8 --top 6
    echo "-- v3err A8 vs A7 thr 20 (gt none)"; node v3err.mjs --mask $B --gt none --x $C/hold_A8 --ref $C/hold_A7 --thr 20 --top 4
  } > $A/hold.txt 2>&1 ;;
holdre|gov)
  D=$C/$1; B=$D/base
  { node capcmp.mjs $D/a8 $D/a7 8
    node popscan.mjs --mask $B --gt $B --thr 40 --json $A/popscan_$1.json A7=$D/a7 A8=$D/a8 --top 6 2>&1
    echo "-- popnew A8 vs A7"; node popnew.mjs --mask $B --gt $B --x $D/a8 --ref $D/a7 --top 8
    echo "-- popnew A7 vs A8"; node popnew.mjs --mask $B --gt $B --x $D/a7 --ref $D/a8 --top 4
    echo "-- v3err A8 vs A7 thr 8 (gt none)"; node v3err.mjs --mask $B --gt none --x $D/a8 --ref $D/a7 --thr 8 --top 6
    echo "-- v3err A8 vs A7 thr 20 (gt none)"; node v3err.mjs --mask $B --gt none --x $D/a8 --ref $D/a7 --thr 20 --top 4
  } > $A/$1.txt 2>&1 ;;
esac
echo "anaM $1 done $(date +%T)"
