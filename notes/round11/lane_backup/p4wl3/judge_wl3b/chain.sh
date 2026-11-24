#!/bin/zsh
# judge_wl3b gate chain (independent re-runs). Serial, one slot job at a time. Lane :5168 read-only.
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
J=$SP/work_p4/judge_wl3b; S=$SP/slot/slot.mjs; T=$J/tools; PT=$SP/work_p4/p4rxa/tools/pop; cd $J
mkdir -p id rl caps perf st fair img
log() { echo "$(date +%T) $*" >> $J/run.log; }
P() { node $S run "judge_wl3b:ident" -- node $T/identP.mjs "$@" > /dev/null 2>&1; }
Q() { node $S run "judge_wl3b:ident" -- node $T/identPose.mjs "$@" > /dev/null 2>&1; }
log CHAIN start
# 1. ident (own re-run)
P --port 5167 --qs "" --out id/B_T1.json;  P --port 5168 --qs wl3b=0 --out id/b0_T1.json
P --port 5162 --qs "" --out id/M_T1.json;  P --port 5168 --qs p4wl=0 --out id/p0_T1.json
P --port 5167 --tier T2 --qs "" --out id/B_T2.json; P --port 5168 --tier T2 --qs wl3b=0 --out id/b0_T2.json
P --port 5162 --mobile --qs "" --out id/M_T0.json; P --port 5168 --mobile --qs "" --out id/on_T0.json
Q --port 5167 --qs "" --pose expand,2.97 --out id/B_e297.json; Q --port 5168 --qs wl3b=0 --pose expand,2.97 --out id/b0_e297.json
P --port 5168 --qs "" --out id/on_T1.json
{ node $T/identcmp.mjs id/B_T1.json id/b0_T1.json "wl3b=0_vs_5167_T1"
  node $T/identcmp.mjs id/M_T1.json id/p0_T1.json "p4wl=0_vs_5162_T1"
  node $T/identcmp.mjs id/B_T2.json id/b0_T2.json "wl3b=0_vs_5167_T2"
  node $T/identcmp.mjs id/M_T0.json id/on_T0.json "lane_ON_vs_5162_T0phone"
  node $T/identcmp.mjs id/B_e297.json id/b0_e297.json "wl3b=0_vs_5167_expand2.97"
  node $T/identcmp.mjs id/B_T1.json id/on_T1.json "CONTROL_lane_ON_vs_5167_T1"; } > id/ident_summary.txt 2>&1
log "ident done $(grep -c IDENTICAL id/ident_summary.txt) identical"
# 2. real loop T1 DPR 2 (1440x766), alternated M / L / B: left region, then the lip band
RL() { local port=$1 tag=$2 rx=$3 ry=$4 rw=$5 rh=$6 dpr=$7 qs=$8
  node $S run "judge_wl3b:rl-$tag" -- zsh -c "cd $J; node $T/rl.mjs --frames 150 --vw 1440 --vh 766 --rx $rx --ry $ry --rw $rw --rh $rh --url http://localhost:$port/ --qs 'tier=T1&scale=1$qs' --dpr $dpr --out rl/$tag > rl/$tag.txt 2>&1 & pid=\$!; for k in {1..150}; do sleep 1; grep -q 'frames' rl/$tag.txt && break; done; sleep 1; kill \$pid 2>/dev/null; true"
  log "rl $tag $(tail -1 rl/$tag.txt | cut -c1-100)"; }
for i in a b; do RL 5168 lL_$i 0 440 480 180 2; RL 5162 lM_$i 0 440 480 180 2; RL 5167 lB_$i 0 440 480 180 2; done
RL 5168 pL_a 860 420 580 180 2; RL 5162 pM_a 860 420 580 180 2; RL 5167 pB_a 860 420 580 180 2
log "rl d2 done"
# 3. rest T1 / T2 (cols.py / colmatch.py), DPR 1 1440x766
for pp in 5162:main 5167:wl2 5168:lane; do node $S run "judge_wl3b:rest" -- node $T/cap.mjs --port ${pp%%:*} --path rest --frames 3 --pre 30 --vw 1440 --vh 766 --dsf 1 --tier T1 --out caps/rest_T1_${pp#*:} > caps/rest_T1_${pp#*:}.log 2>&1; done
for pp in 5162:main 5168:lane; do node $S run "judge_wl3b:rest" -- node $T/cap.mjs --port ${pp%%:*} --path rest --frames 3 --pre 30 --vw 1440 --vh 766 --dsf 1 --tier T2 --out caps/rest_T2_${pp#*:} > caps/rest_T2_${pp#*:}.log 2>&1; done
log "rest done"
# 4. stepped fast path T1 DPR 2 for the 4x lip sheets (same poses), GT = per-pixel walk + lkmeach at 2x
C() { local tag=$1; shift; node $S run "judge_wl3b:st-$tag" -- node $T/cap.mjs --tier T1 --path fast "$@" --out st/$tag > st/$tag.log 2>&1; log "st $tag $(tail -1 st/$tag.log | cut -c1-60)"; }
C FL --port 5168 --frames 48 --pre 30 --dsf 2 --rows 400,640,766
C FM --port 5162 --frames 48 --pre 30 --dsf 2 --rows 400,640,766
C FB --port 5167 --frames 48 --pre 30 --dsf 2 --rows 400,640,766
C FGTpx --port 5168 --frames 48 --pre 30 --vw 2880 --vh 1532 --rows 400,640,766 --qs "wlwalk=px&lkmeach=1"
log "st done"
# 5. perf (STRICT, T1 pointer sweep), A = :5162, B = :5168
STRICT=1 SLOT_BG=0 MODE= GATE_S=120 node $S run 'judge_wl3b:perf-sweep' -- node $T/perfab.mjs perf/sweep.json 8 'http://localhost:5162/?tier=T1' 'http://localhost:5168/?tier=T1' 6 12 > perf/sweep.txt 2>&1
log "perf done $(grep -c VALID perf/sweep.txt)"
# 6. real loop T1 DPR 1 left + T2 DPR 2 left
RL 5168 dL_a 0 440 480 180 1; RL 5162 dM_a 0 440 480 180 1
RL 5168 tL_a 0 440 480 180 2 "&tier=T2"; RL 5162 tM_a 0 440 480 180 2 "&tier=T2"
log "rl d1/t2 done"
# 7. FAIR fast + reverse vs the lane's own 16-sample GT
mask_of() { case $1 in slow|medium|reverse) echo $SP/work5/aa5b/caps/$1_bmask;; fast|diag) echo $SP/work5/aa5a/caps/$1_mask;; esac; }
b=L; F=$J/fair
for p in fast reverse; do n=240; [ $p = fast ] && n=120
  node $S run "judge_wl3b:fair-$p" -- node $T/cap.mjs --port 5168 --tier T1 --path $p --rows 380,766 --frames 240 --out $F/${p}_$b > $F/${p}_$b.log 2>&1
  node $S run "judge_wl3b:fair-$p-gt" -- zsh -c "node $T/cap.mjs --port 5168 --tier T1 --path $p --frames $n --vw 2880 --vh 1532 --rows 380,766,766 --qs lkmeach=1 --out $F/${p}_${b}_gt2x > $F/${p}_${b}_gt.log 2>&1 && node $T/down2.mjs $F/${p}_${b}_gt2x $F/${p}_${b}_gt >> $F/${p}_${b}_gt.log && rm -rf $F/${p}_${b}_gt2x"
  echo "## $b $p: $(node $PT/popscan.mjs --mask $(mask_of $p) --gt $F/${p}_${b}_gt --minpx 6 $b=$F/${p}_$b 2>&1 | grep -m3 -i 'events\|clusters\|>= 6\|total' | tr '\n' ' ' | cut -c1-260)" >> $F/fair_$b.txt
  rm -rf $F/${p}_$b $F/${p}_${b}_gt
  log "fair $p done"
done
log CHAIN DONE
