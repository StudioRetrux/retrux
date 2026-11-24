#!/bin/zsh
# wl2 integrator gate chain on the merged build :5167 (= p4wl + wl2g). Serial: one slot job at a time (STRICT perf runs alone).
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
W=$SP/work_p4/wl2; G=$SP/work_p4/wl2g; S=$SP/slot/slot.mjs; T=$W/tools; PT=$SP/work_p4/p4rxa/tools/pop; cd $W
log() { echo "$(date +%T) $*" >> $W/run.log; }
P() { node $S run "wl2:ident" -- node $T/identP.mjs "$@" > /dev/null 2>&1; }
Q() { node $S run "wl2:ident" -- node $T/identPose.mjs "$@" > /dev/null 2>&1; }
log ident start
P --port 5167 --qs wl2g=0 --out id/g0_T1.json; P --port 5167 --qs p4wl=0 --out id/p0_T1.json; P --port 5167 --out id/on_T1.json
P --port 5167 --tier T2 --qs wl2g=0 --out id/g0_T2.json; P --port 5167 --tier T2 --qs p4wl=0 --out id/p0_T2.json
P --port 5167 --mobile --qs wl2g=0 --out id/g0_T0.json; P --port 5167 --mobile --qs p4wl=0 --out id/p0_T0.json; P --port 5167 --mobile --out id/on_T0.json
for p in expand,0.9 expand,2.97 release,0.33; do n=${p/,/_}; Q --port 5167 --qs wl2g=0 --pose $p --out id/g0_$n.json; Q --port 5167 --qs p4wl=0 --pose $p --out id/p0_$n.json; done
{ for t in T1 T2 T0 expand_0.9 expand_2.97 release_0.33; do node $T/identcmp.mjs $G/id/L_$t.json id/g0_$t.json "wl2g=0_vs_5163_$t"; done
  for t in T1 T2 T0 expand_0.9 expand_2.97 release_0.33; do node $T/identcmp.mjs $G/id/m_$t.json id/p0_$t.json "p4wl=0_vs_5162_$t"; done
  node $T/identcmp.mjs $G/id/L_T0.json id/on_T0.json "merged_on_vs_5163_T0"
  node $T/identcmp.mjs $G/id/on_T1.json id/on_T1.json "merged_on_vs_wl2g_5164_T1"
  node $T/identcmp.mjs $G/id/on_T0.json id/on_T0.json "merged_on_vs_wl2g_5164_T0"
  node $T/identcmp.mjs $G/id/L_T1.json id/on_T1.json "CONTROL_merged_on_vs_5163_T1"; } > id/ident_summary.txt 2>&1
log ident done
C() { local tag=$1; shift; node $S run "wl2:st-$tag" -- node $T/cap.mjs --tier T1 --path fast --frames 120 "$@" --out st/$tag > st/$tag.log 2>&1; log "st $tag $(tail -1 st/$tag.log | cut -c1-90)"; }
C d1_W --port 5167 --rows 380,766
C d2_W --port 5167 --rows 380,766 --dsf 2
for t in T1 T2; do for pp in 5162:main 5167:wl2; do port=${pp%%:*}; b=${pp#*:}
  node $S run "wl2:rest" -- node $T/cap.mjs --port $port --path rest --frames 3 --pre 5 --vw 1440 --vh 766 --dsf 1 --tier $t --out caps/rest_${t}_$b > caps/rest_${t}_$b.log 2>&1; done; done
log rest done
STRICT=1 SLOT_BG=0 MODE= GATE_S=150 node $S run 'wl2:perf-sweep' -- node $T/perfab.mjs perf/sweep.json 8 'http://localhost:5162/?tier=T1' 'http://localhost:5167/?tier=T1' 6 12 > perf/sweep.txt 2>&1
log "perf done $(grep -c VALID perf/sweep.txt) valid-lines"
mask_of() { case $1 in slow|medium|reverse) echo $SP/work5/aa5b/caps/$1_bmask;; fast|diag) echo $SP/work5/aa5a/caps/$1_mask;; leave|rest) echo $SP/work6/refl/caps/$1_bmask;; esac; }
b=W; F=$W/fair
for p in fast reverse slow medium diag leave; do n=240; [ $p = fast -o $p = diag ] && n=120
  node $S run "wl2:fair-$p" -- node $T/cap.mjs --port 5167 --tier T1 --path $p --rows 380,766 --frames 240 --out $F/${p}_$b > $F/${p}_$b.log 2>&1
  node $S run "wl2:fair-$p-gt" -- zsh -c "node $T/cap.mjs --port 5167 --tier T1 --path $p --frames $n --vw 2880 --vh 1532 --rows 380,766,766 --qs lkmeach=1 --out $F/${p}_${b}_gt2x > $F/${p}_${b}_gt.log 2>&1 && node $T/down2.mjs $F/${p}_${b}_gt2x $F/${p}_${b}_gt >> $F/${p}_${b}_gt.log && rm -rf $F/${p}_${b}_gt2x"
  echo "## $b $p: $(node $PT/popscan.mjs --mask $(mask_of $p) --gt $F/${p}_${b}_gt --minpx 6 $b=$F/${p}_$b 2>&1 | grep -m3 -i 'events\|clusters\|>= 6\|total' | tr '\n' ' ' | cut -c1-260)" >> $F/fair_$b.txt
  log "fair $p done"
done
echo "DONE_$b" >> $F/fair_$b.txt; log CHAIN DONE
