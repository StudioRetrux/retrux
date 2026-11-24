#!/bin/zsh
# judge_wl2g chain A: own same-pose lane captures (d1, d2), ident, FAIR fast+reverse (lane vs own GT), real loop T1 DPR 2
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
J=$SP/work_p4/judge_wl2g; S=$SP/slot/slot.mjs; T=$J/tools; PT=$SP/work_p4/p4rxa/tools/pop; L=$J/chainA.log
log() { echo "$(date +%T) $*" >> $L; }
C() { local tag=$1; shift; node $S run "judge_wl2g:st-$tag" -- node $T/cap.mjs --tier T1 --path fast --frames 120 "$@" --out $J/st/$tag > $J/st/$tag.log 2>&1; log "st $tag $(tail -1 $J/st/$tag.log | cut -c1-90)"; }
C d1_L --port 5164 --rows 380,766
C d2_L --port 5164 --rows 380,766 --dsf 2
cd $J
P() { node $S run "judge_wl2g:ident" -- node $T/identP.mjs "$@" > /dev/null 2>&1; }
Q() { node $S run "judge_wl2g:ident" -- node $T/identPose.mjs "$@" > /dev/null 2>&1; }
P --port 5163 --out id/ref5163_T1.json; P --port 5164 --qs wl2g=0 --out id/g0_T1.json; P --port 5164 --qs p4wl=0 --out id/p0_T1.json
P --port 5164 --tier T2 --qs wl2g=0 --out id/g0_T2.json; P --port 5164 --tier T2 --qs p4wl=0 --out id/p0_T2.json
P --port 5164 --mobile --qs wl2g=0 --out id/g0_T0.json; P --port 5164 --mobile --qs p4wl=0 --out id/p0_T0.json; P --port 5164 --mobile --out id/on_T0.json
for p in expand,2.97 release,0.33; do n=${p/,/_}; Q --port 5164 --qs wl2g=0 --pose $p --out id/g0_$n.json; Q --port 5164 --qs p4wl=0 --pose $p --out id/p0_$n.json; done
B=$SP/work_p4/wl2g/id
{ node $T/identcmp.mjs id/ref5163_T1.json $B/L_T1.json "fresh5163_vs_builderref_T1"
  for t in T1 T2 T0 expand_2.97 release_0.33; do node $T/identcmp.mjs $B/L_$t.json id/g0_$t.json "wl2g=0_vs_5163_$t"; done
  node $T/identcmp.mjs id/ref5163_T1.json id/g0_T1.json "wl2g=0_vs_FRESH5163_T1"
  for t in T1 T2 T0 expand_2.97 release_0.33; do node $T/identcmp.mjs $B/m_$t.json id/p0_$t.json "p4wl=0_vs_5162_$t"; done
  node $T/identcmp.mjs $B/L_T0.json id/on_T0.json "lane_on_vs_5163_T0"; } > id/ident_summary.txt 2>&1
echo IDDONE >> id/ident_summary.txt; log ident done
mask_of() { case $1 in slow|medium|reverse) echo $SP/work5/aa5b/caps/$1_bmask;; fast|diag) echo $SP/work5/aa5a/caps/$1_mask;; leave|rest) echo $SP/work6/refl/caps/$1_bmask;; esac; }
F=$J/fair; b=L
for p in fast reverse; do n=240; [ $p = fast ] && n=120
  node $S run "judge_wl2g:fair-$p" -- node $T/cap.mjs --port 5164 --tier T1 --path $p --rows 380,766 --frames 240 --out $F/${p}_$b > $F/${p}_$b.log 2>&1
  node $S run "judge_wl2g:fair-$p-gt" -- zsh -c "node $T/cap.mjs --port 5164 --tier T1 --path $p --frames $n --vw 2880 --vh 1532 --rows 380,766,766 --qs lkmeach=1 --out $F/${p}_${b}_gt2x > $F/${p}_${b}_gt.log 2>&1 && node $T/down2.mjs $F/${p}_${b}_gt2x $F/${p}_${b}_gt >> $F/${p}_${b}_gt.log && rm -rf $F/${p}_${b}_gt2x"
  echo "## $b $p: $(node $PT/popscan.mjs --mask $(mask_of $p) --gt $F/${p}_${b}_gt --minpx 6 $b=$F/${p}_$b 2>&1 | grep -m3 -i 'events\|clusters\|>= 6\|total' | tr '\n' ' ' | cut -c1-260)" >> $F/fair_$b.txt
  log "fair $p done"
done
node $S run "judge_wl2g:rl" -- zsh -c "for p in 5162:main 5164:lane 5163:p4wl; do node $T/rl.mjs --frames 150 --rx 0 --ry 440 --rw 480 --rh 180 --url http://localhost:\${p%%:*}/ --qs 'tier=T1&scale=1' --dpr 2 --out $J/rl/T1d2_\${p#*:} | tail -1; done" > $J/rl/run.log 2>&1
log RLDONE
