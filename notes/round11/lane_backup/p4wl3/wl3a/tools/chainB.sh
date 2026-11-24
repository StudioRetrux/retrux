#!/bin/zsh
# wl3a gates: ident (wl3a=0 vs :5167, p4wl=0 vs :5162; T1, T2, T0 phone, p04 / p06 / p07) and FAIR on six paths vs own GT
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
W=$SP/work_p4/wl3a; S=$SP/slot/slot.mjs; T=$W/tools; cd $W
log() { echo "$(date +%T) $*" >> $W/gates.log; }
P() { node $S run "wl3a:ident" -- node $T/identP.mjs "$@" > /dev/null 2>&1; }
Q() { node $S run "wl3a:ident" -- node $T/identPose.mjs "$@" > /dev/null 2>&1; }
set6() { local port=$1 qs=$2 tag=$3
  P --port $port --qs "$qs" --out id/${tag}_T1.json; P --port $port --tier T2 --qs "$qs" --out id/${tag}_T2.json
  P --port $port --mobile --qs "$qs" --out id/${tag}_T0.json
  Q --port $port --qs "$qs" --pose expand,0.9 --out id/${tag}_p04.json; Q --port $port --qs "$qs" --pose expand,2.97 --out id/${tag}_p06.json
  Q --port $port --qs "$qs" --pose release,0.33 --out id/${tag}_p07.json; }
{ set6 5167 "" W; set6 5169 "wl3a=0" a0; P --port 5169 --out id/on_T1.json; log "ident A done"; } &
{ set6 5162 "" m; set6 5169 "p4wl=0" p0; P --port 5169 --mobile --out id/on_T0.json; log "ident B done"; } &
{ PT=$SP/work_p4/p4rxa/tools/pop; F=$W/fair; b=L
  mask_of() { case $1 in slow|medium|reverse) echo $SP/work5/aa5b/caps/$1_bmask;; fast|diag) echo $SP/work5/aa5a/caps/$1_mask;; leave|rest) echo $SP/work6/refl/caps/$1_bmask;; esac; }
  for p in fast reverse slow medium diag leave; do n=240; [ $p = fast -o $p = diag ] && n=120
    node $S run "wl3a:fair-$p" -- node $T/cap.mjs --port 5169 --tier T1 --path $p --rows 380,766 --frames 240 --out $F/${p}_$b > $F/${p}_$b.log 2>&1
    node $S run "wl3a:fair-$p-gt" -- zsh -c "node $T/cap.mjs --port 5169 --tier T1 --path $p --frames $n --vw 2880 --vh 1532 --rows 380,766,766 --qs lkmeach=1 --out $F/${p}_${b}_gt2x > $F/${p}_${b}_gt.log 2>&1 && node $T/down2.mjs $F/${p}_${b}_gt2x $F/${p}_${b}_gt >> $F/${p}_${b}_gt.log && rm -rf $F/${p}_${b}_gt2x"
    echo "## $b $p: $(node $PT/popscan.mjs --mask $(mask_of $p) --gt $F/${p}_${b}_gt --minpx 6 $b=$F/${p}_$b 2>&1 | grep -m3 -i 'events\|clusters\|>= 6\|total' | tr '\n' ' ' | cut -c1-260)" >> $F/fair_$b.txt
    rm -rf $F/${p}_$b $F/${p}_${b}_gt; log "fair $p done"; done
  echo "DONE_$b" >> $F/fair_$b.txt; } &
wait; log "CHAIN B DONE"
