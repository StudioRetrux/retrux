#!/bin/zsh
# BASE | AA3 | X | GT time slices for the six boxes (rows across moving edges), 3x zoom; args: PATH(slow|medium) XSEQ TAG [k1]
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
W=$SP/work4/aa4x; C=$SP/work3/aa3/caps; P=$1; X=$2; T=$3; K1=${4:-120}
cd $W/tools; mkdir -p $W/look/slices
for spec in "FS 690 330 420" "WR 690 1000 1090" "DR 745 400 490" "FF 520 160 250" "FR 490 1000 1090" "RS 650 940 1030"; do
  set -- ${=spec}
  node slice.mjs --row $2 --x0 $3 --x1 $4 --k0 0 --k1 $K1 --zoom 3 --out $W/look/slices/${P}_${1}_r$2_base_aa3_${T}_gt.png $C/${P}_base $C/${P}_F $X $C/${P}_gt > /dev/null
done
ls $W/look/slices | grep "^${P}_" | grep $T
