#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
W=$SP/work_p4/wl2/fix; S=$SP/slot/slot.mjs; T=$W/tools; cd $W; PT=$SP/work_p4/p4rxa/tools/pop
log() { echo "$(date +%T) $*" >> $W/run.log; }
until grep -q 'perf done' $W/run.log; do sleep 3; done
node $S run "wl2fix:st-d2_FIN" -- node $T/cap.mjs --tier T1 --path fast --frames 120 --port 5167 --rows 380,766 --dsf 2 --out st/d2_FIN > st/d2_FIN.log 2>&1; log "st d2_FIN done"
mask_of() { case $1 in slow|medium|reverse) echo $SP/work5/aa5b/caps/$1_bmask;; fast|diag) echo $SP/work5/aa5a/caps/$1_mask;; leave|rest) echo $SP/work6/refl/caps/$1_bmask;; esac; }
b=X; F=$W/fair; mkdir -p $F
for p in fast reverse; do n=240; [ $p = fast -o $p = diag ] && n=120
  node $S run "wl2fix:fair-$p" -- node $T/cap.mjs --port 5167 --tier T1 --path $p --rows 380,766 --frames 240 --out $F/${p}_$b > $F/${p}_$b.log 2>&1
  node $S run "wl2fix:fair-$p-gt" -- zsh -c "node $T/cap.mjs --port 5167 --tier T1 --path $p --frames $n --vw 2880 --vh 1532 --rows 380,766,766 --qs lkmeach=1 --out $F/${p}_${b}_gt2x > $F/${p}_${b}_gt.log 2>&1 && node $T/down2.mjs $F/${p}_${b}_gt2x $F/${p}_${b}_gt >> $F/${p}_${b}_gt.log && rm -rf $F/${p}_${b}_gt2x"
  echo "## $b $p: $(node $PT/popscan.mjs --mask $(mask_of $p) --gt $F/${p}_${b}_gt --minpx 6 $b=$F/${p}_$b 2>&1 | grep -m3 -i 'events\|clusters\|>= 6\|total' | tr '\n' ' ' | cut -c1-260)" >> $F/fair_$b.txt
  log "fair $p done"
done
log "POST DONE"
