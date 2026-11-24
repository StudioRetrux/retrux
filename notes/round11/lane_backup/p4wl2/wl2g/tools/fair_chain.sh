#!/bin/zsh
# wl2g FAIR: one build ($1 port, $2 tag), six paths, each vs its OWN 16-sample 2x GT (lkmeach=1), popscan --minpx 6 (gt_new/fair.sh)
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
W=$SP/work_p4/wl2g; S=$SP/slot/slot.mjs; T=$W/tools; F=$W/fair; PT=$SP/work_p4/p4rxa/tools/pop
port=$1; b=$2; shift 2; if (( $# )); then paths=($@); else paths=(slow medium fast diag reverse leave); fi
mask_of() { case $1 in slow|medium|reverse) echo $SP/work5/aa5b/caps/$1_bmask;; fast|diag) echo $SP/work5/aa5a/caps/$1_mask;; leave|rest) echo $SP/work6/refl/caps/$1_bmask;; esac; }
for p in $paths; do n=240; [ $p = fast -o $p = diag ] && n=120
  node $S run "wl2g:fair-$p-$b" -- node $T/cap.mjs --port $port --tier T1 --path $p --rows 380,766 --frames 240 --out $F/${p}_$b > $F/${p}_$b.log 2>&1
  node $S run "wl2g:fair-$p-$b-gt" -- zsh -c "node $T/cap.mjs --port $port --tier T1 --path $p --frames $n --vw 2880 --vh 1532 --rows 380,766,766 --qs lkmeach=1 --out $F/${p}_${b}_gt2x > $F/${p}_${b}_gt.log 2>&1 && node $T/down2.mjs $F/${p}_${b}_gt2x $F/${p}_${b}_gt >> $F/${p}_${b}_gt.log && rm -rf $F/${p}_${b}_gt2x"
  echo "## $b $p: $(node $PT/popscan.mjs --mask $(mask_of $p) --gt $F/${p}_${b}_gt --minpx 6 $b=$F/${p}_$b 2>&1 | grep -m3 -i 'events\|clusters\|>= 6\|total' | tr '\n' ' ' | cut -c1-260)" >> $F/fair_$b.txt
done
echo "DONE_$b" >> $F/fair_$b.txt
