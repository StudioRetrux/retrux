#!/bin/zsh
# judge_wl3c stepped chain (deterministic captures; starts after chain T): ident, FAIR fast + reverse, rest T1/T2 caps, same-pose c30, s60, slow path, hold
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
J=$SP/work_p4/judge_wl3c; S=$SP/slot/slot.mjs; T=$J/tools; cd $J
log() { echo "$(date +%T) $*" >> $J/run.log; }
until grep -q "CHAIN T DONE" $J/run.log; do sleep 3; done
log "CHAIN S start"
P() { node $S run "judge_wl3c:ident" -- node $T/identP.mjs "$@" > /dev/null 2>&1; }
Q() { node $S run "judge_wl3c:ident" -- node $T/identPose.mjs "$@" > /dev/null 2>&1; }
{ P --port 5167 --out id/B_T1.json; P --port 5169 --qs wl3a=0 --out id/a0_T1.json
  P --port 5162 --out id/M_T1.json; P --port 5169 --qs p4wl=0 --out id/p0_T1.json
  P --port 5167 --tier T2 --out id/B_T2.json; P --port 5169 --tier T2 --qs wl3a=0 --out id/a0_T2.json
  P --port 5162 --tier T2 --out id/M_T2.json; P --port 5169 --tier T2 --qs p4wl=0 --out id/p0_T2.json
  P --port 5167 --mobile --out id/B_T0.json; P --port 5169 --mobile --qs wl3a=0 --out id/a0_T0.json
  P --port 5162 --mobile --out id/M_T0.json; P --port 5169 --mobile --qs p4wl=0 --out id/p0_T0.json; P --port 5169 --mobile --out id/on_T0.json
  for ps in p04:expand,0.9 p06:expand,2.97 p07:release,0.33; do t=${ps%%:*}; po=${ps#*:}
    Q --port 5167 --pose $po --out id/B_$t.json; Q --port 5169 --qs wl3a=0 --pose $po --out id/a0_$t.json
    Q --port 5162 --pose $po --out id/M_$t.json; Q --port 5169 --qs p4wl=0 --pose $po --out id/p0_$t.json; done
  P --port 5169 --out id/on_T1.json; P --port 5169 --qs wl3c=0 --out id/c0_T1.json
  { for t in T1 T2 T0 p04 p06 p07; do node $T/identcmp.mjs id/B_$t.json id/a0_$t.json "wl3a=0_vs_5167_$t"; node $T/identcmp.mjs id/M_$t.json id/p0_$t.json "p4wl=0_vs_5162_$t"; done
    node $T/identcmp.mjs id/M_T0.json id/on_T0.json "lane_ON_vs_5162_T0phone"
    node $T/identcmp.mjs id/B_T1.json id/on_T1.json "CONTROL_lane_ON_vs_5167_T1"
    node $T/identcmp.mjs id/on_T1.json id/c0_T1.json "CONTROL_wl3c=0_vs_lane_T1"; } > id/ident_summary.txt 2>&1
  log "ident done"; } &
{ PT=$SP/work_p4/p4rxa/tools/pop; F=$J/fair; b=L
  mask_of() { case $1 in slow|medium|reverse) echo $SP/work5/aa5b/caps/$1_bmask;; fast|diag) echo $SP/work5/aa5a/caps/$1_mask;; leave|rest) echo $SP/work6/refl/caps/$1_bmask;; esac; }
  for p in fast reverse; do n=240; [ $p = fast ] && n=120
    node $S run "judge_wl3c:fair-$p" -- node $T/cap.mjs --port 5169 --tier T1 --path $p --rows 380,766 --frames 240 --out $F/${p}_$b > $F/${p}_$b.log 2>&1
    node $S run "judge_wl3c:fair-$p-gt" -- zsh -c "node $T/cap.mjs --port 5169 --tier T1 --path $p --frames $n --vw 2880 --vh 1532 --rows 380,766,766 --qs lkmeach=1 --out $F/${p}_${b}_gt2x > $F/${p}_${b}_gt.log 2>&1 && node $T/down2.mjs $F/${p}_${b}_gt2x $F/${p}_${b}_gt >> $F/${p}_${b}_gt.log && rm -rf $F/${p}_${b}_gt2x"
    echo "## $b $p: $(node $PT/popscan.mjs --mask $(mask_of $p) --gt $F/${p}_${b}_gt --minpx 6 $b=$F/${p}_$b 2>&1 | grep -m3 -i 'events\|clusters\|>= 6\|total' | tr '\n' ' ' | cut -c1-260)" >> $F/fair_$b.txt
    log "fair $p done"; done; } &
{ for tr in T1 T2; do for pp in 5162:main 5167:wl2 5169:lane; do port=${pp%%:*}; b=${pp#*:}
    node $S run "judge_wl3c:rest" -- node $T/cap.mjs --port $port --path rest --frames 3 --pre 5 --vw 1440 --vh 766 --dsf 1 --tier $tr --out caps/rest_${tr}_$b > caps/rest_${tr}_$b.log 2>&1; done; done
  log "rest done"
  for r in 5162:M 5167:W 5169:L; do port=${r%%:*}; tag=${r#*:}
    node $S run "judge_wl3c:capdt-$tag" -- node $T/capdt.mjs --port $port --out st/c30_$tag --path circle --dt 0.0333333 --vw 1512 --vh 860 --dsf 2 --tier T1 --rows 440,620,860 --frames 150 --pre 30 > st/c30_$tag.log 2>&1
    log "capdt $tag $(tail -1 st/c30_$tag.log | cut -c1-100)"; done; } &
wait
{ for r in 5162:main 5169:lane; do
    node $S run "judge_wl3c:s60" -- zsh -c "LAB=http://localhost:${r%%:*} TIER=T1 PREFIX=s CLIP=860,420,580,200 node $T/shoot_ripple.mjs s60/far_${r#*:} 40 0.0166666667 100 > s60/far_${r#*:}.log 2>&1; LAB=http://localhost:${r%%:*} TIER=T1 PREFIX=s CLIP=0,430,560,200 node $T/shoot_ripple.mjs s60/left_${r#*:} 40 0.0166666667 100 > s60/left_${r#*:}.log 2>&1"; done
  log "s60 done"; } &
{ for pp in 5162:main 5167:wl2 5169:lane; do port=${pp%%:*}; b=${pp#*:}
    node $S run "judge_wl3c:slow" -- node $T/cap.mjs --port $port --path slow --frames 240 --pre 30 --vw 1440 --vh 766 --dsf 1 --tier T1 --rows 380,766 --out caps/slow_$b > caps/slow_$b.log 2>&1; done
  log "slow done"; } &
{ for pp in 5162:main 5169:lane; do port=${pp%%:*}; b=${pp#*:}
    node $S run "judge_wl3c:hold" -- node $T/cap.mjs --port $port --path hold --frames 330 --pre 30 --vw 1440 --vh 766 --dsf 1 --tier T1 --rows 380,766 --out caps/hold_$b > caps/hold_$b.log 2>&1; done
  log "hold done"; } &
wait; log "CHAIN S DONE"
