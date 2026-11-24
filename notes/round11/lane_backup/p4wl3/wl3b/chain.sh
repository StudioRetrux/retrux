#!/bin/zsh
# wl3b gate chain on the FINAL build (:5168). Serial, one slot job at a time.
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
W=$SP/work_p4/wl3b; S=$SP/slot/slot.mjs; T=$W/tools; PT=$SP/work_p4/p4rxa/tools/pop; cd $W
log() { echo "$(date +%T) $*" >> $W/run.log; }
P() { node $S run "wl3b:ident" -- node $T/identP.mjs "$@" > /dev/null 2>&1; }
Q() { node $S run "wl3b:ident" -- node $T/identPose.mjs "$@" > /dev/null 2>&1; }
log CHAIN start
# 1. ident
for pp in 5167:B:"" 5168:b0:wl3b=0 5162:M:"" 5168:p0:p4wl=0; do port=${pp%%:*}; r=${pp#*:}; tag=${r%%:*}; qs=${r#*:}
  P --port $port --qs "$qs" --out id/${tag}_T1.json; P --port $port --tier T2 --qs "$qs" --out id/${tag}_T2.json; P --port $port --mobile --qs "$qs" --out id/${tag}_T0.json
  for p in expand,0.9 expand,2.97 release,0.33; do Q --port $port --qs "$qs" --pose $p --out id/${tag}_${p/,/_}.json; done; done
P --port 5168 --out id/on_T1.json; P --port 5168 --mobile --out id/on_T0.json
{ for t in T1 T2 T0 expand_0.9 expand_2.97 release_0.33; do node $T/identcmp.mjs id/B_$t.json id/b0_$t.json "wl3b=0_vs_5167_$t"; done
  for t in T1 T2 T0 expand_0.9 expand_2.97 release_0.33; do node $T/identcmp.mjs id/M_$t.json id/p0_$t.json "p4wl=0_vs_5162_$t"; done
  node $T/identcmp.mjs id/B_T0.json id/on_T0.json "lane_ON_vs_5167_T0phone"
  node $T/identcmp.mjs id/M_T0.json id/on_T0.json "lane_ON_vs_5162_T0phone"
  node $T/identcmp.mjs id/B_T1.json id/on_T1.json "CONTROL_lane_ON_vs_5167_T1"; } > id/ident_summary.txt 2>&1
log "ident done $(grep -c IDENTICAL id/ident_summary.txt) identical-lines"
# 2. stepped final captures (fast path T1 DPR 2 and DPR 1, far + lips + left rows; lane GT)
C() { local tag=$1; shift; node $S run "wl3b:st-$tag" -- node $T/cap.mjs --tier T1 --path fast "$@" --out st/$tag > st/$tag.log 2>&1; log "st $tag $(tail -1 st/$tag.log | cut -c1-60)"; }
C FL --port 5168 --frames 120 --pre 30 --dsf 2 --rows 400,640,766
C FM --port 5162 --frames 120 --pre 30 --dsf 2 --rows 400,640,766
C FB --port 5167 --frames 120 --pre 30 --dsf 2 --rows 400,640,766
C FGT --port 5168 --frames 40 --pre 30 --vw 2880 --vh 1532 --rows 400,640,766 --qs "lkmeach=1"
C FGTpx --port 5168 --frames 40 --pre 30 --vw 2880 --vh 1532 --rows 400,640,766 --qs "wlwalk=px&lkmeach=1"
C D1L --port 5168 --frames 40 --pre 30 --rows 400,640,766
C D1M --port 5162 --frames 40 --pre 30 --rows 400,640,766
C D1B --port 5167 --frames 40 --pre 30 --rows 400,640,766
# 3. rest final T1 / T2
for t in T1 T2; do node $S run "wl3b:rest" -- node $T/cap.mjs --port 5168 --path rest --frames 3 --pre 30 --vw 1440 --vh 766 --dsf 1 --tier $t --out caps/rest_${t}_fin > caps/rest_${t}_fin.log 2>&1; done
# 4. 60 fps sparkle at rest (40 frames at 1/60 s, T1 DPR 2)
for pp in 5162:M 5167:B 5168:L; do node $S run "wl3b:s60" -- node $T/cap.mjs --port ${pp%%:*} --tier T1 --path rest --frames 40 --pre 30 --dsf 2 --rows 400,640,766 --out s60/${pp#*:} > s60/${pp#*:}.log 2>&1; done
log "st/rest/s60 done"
# 5. real loop T1 DPR 2 (1440x766): left region + lip band, alternated
RL() { local port=$1 tag=$2 rx=$3 ry=$4 rw=$5 rh=$6 dpr=$7 qs=$8
  node $S run "wl3b:rl-$tag" -- zsh -c "cd $W; node $T/rl.mjs --frames 150 --vw 1440 --vh 766 --rx $rx --ry $ry --rw $rw --rh $rh --url http://localhost:$port/ --qs 'tier=T1&scale=1$qs' --dpr $dpr --out rl/$tag > rl/$tag.txt 2>&1 & pid=\$!; for k in {1..150}; do sleep 1; grep -q 'frames' rl/$tag.txt && break; done; sleep 1; kill \$pid 2>/dev/null; true"
  log "rl $tag $(tail -1 rl/$tag.txt | cut -c1-100)"; }
for i in a b c; do RL 5162 lM_$i 0 440 480 180 2; RL 5168 lL_$i 0 440 480 180 2; RL 5167 lB_$i 0 440 480 180 2; done
for i in a b; do RL 5162 pM_$i 860 420 580 180 2; RL 5168 pL_$i 860 420 580 180 2; RL 5167 pB_$i 860 420 580 180 2; done
for i in a b; do RL 5162 dM_$i 0 440 480 180 1; RL 5168 dL_$i 0 440 480 180 1; done
for i in a b; do RL 5162 tM_$i 0 440 480 180 2 "&tier=T2"; RL 5168 tL_$i 0 440 480 180 2 "&tier=T2"; done
log "rl done"
# 6. perf (STRICT, T1 pointer sweep)
STRICT=1 SLOT_BG=0 MODE= GATE_S=150 node $S run 'wl3b:perf-sweep' -- node $T/perfab.mjs perf/sweep.json 10 'http://localhost:5162/?tier=T1' 'http://localhost:5168/?tier=T1' 6 13 > perf/sweep.txt 2>&1
log "perf done $(grep -c VALID perf/sweep.txt)"
# 7. FAIR six paths vs the lane's own 16-sample GT
mask_of() { case $1 in slow|medium|reverse) echo $SP/work5/aa5b/caps/$1_bmask;; fast|diag) echo $SP/work5/aa5a/caps/$1_mask;; leave|rest) echo $SP/work6/refl/caps/$1_bmask;; esac; }
b=L; F=$W/fair
for p in fast reverse slow medium diag leave; do n=240; [ $p = fast -o $p = diag ] && n=120
  node $S run "wl3b:fair-$p" -- node $T/cap.mjs --port 5168 --tier T1 --path $p --rows 380,766 --frames 240 --out $F/${p}_$b > $F/${p}_$b.log 2>&1
  node $S run "wl3b:fair-$p-gt" -- zsh -c "node $T/cap.mjs --port 5168 --tier T1 --path $p --frames $n --vw 2880 --vh 1532 --rows 380,766,766 --qs lkmeach=1 --out $F/${p}_${b}_gt2x > $F/${p}_${b}_gt.log 2>&1 && node $T/down2.mjs $F/${p}_${b}_gt2x $F/${p}_${b}_gt >> $F/${p}_${b}_gt.log && rm -rf $F/${p}_${b}_gt2x"
  echo "## $b $p: $(node $PT/popscan.mjs --mask $(mask_of $p) --gt $F/${p}_${b}_gt --minpx 6 $b=$F/${p}_$b 2>&1 | grep -m3 -i 'events\|clusters\|>= 6\|total' | tr '\n' ' ' | cut -c1-260)" >> $F/fair_$b.txt
  rm -rf $F/${p}_$b $F/${p}_${b}_gt
  log "fair $p done"
done
echo "DONE_$b" >> $F/fair_$b.txt; log CHAIN DONE
