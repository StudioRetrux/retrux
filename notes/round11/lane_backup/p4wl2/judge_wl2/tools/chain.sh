#!/bin/zsh
# judge_wl2 (final judge of merged wl2 :5167): serial through the slot. ident (fresh refs) -> STRICT perf -> same-pose d1/d2 -> real loop T1 DPR 2
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
J=$SP/work_p4/judge_wl2; S=$SP/slot/slot.mjs; T=$J/tools; cd $J
log() { echo "$(date +%T) $*" >> $J/run.log; }
P() { node $S run "judge_wl2:ident" -- node $T/identP.mjs "$@" > /dev/null 2>&1; }
Q() { node $S run "judge_wl2:ident" -- node $T/identPose.mjs "$@" > /dev/null 2>&1; }
log ident start
P --port 5163 --out id/L_T1.json; P --port 5167 --qs wl2g=0 --out id/g0_T1.json
P --port 5162 --out id/m_T1.json; P --port 5167 --qs p4wl=0 --out id/p0_T1.json
P --port 5163 --tier T2 --out id/L_T2.json; P --port 5167 --tier T2 --qs wl2g=0 --out id/g0_T2.json
P --port 5162 --mobile --out id/m_T0.json; P --port 5167 --mobile --out id/on_T0.json; P --port 5167 --mobile --qs p4wl=0 --out id/p0_T0.json
Q --port 5163 --pose release,0.33 --out id/L_rel.json; Q --port 5167 --qs wl2g=0 --pose release,0.33 --out id/g0_rel.json
Q --port 5162 --pose expand,2.97 --out id/m_exp.json; Q --port 5167 --qs p4wl=0 --pose expand,2.97 --out id/p0_exp.json
P --port 5167 --out id/on_T1.json
{ node $T/identcmp.mjs id/L_T1.json id/g0_T1.json "wl2g=0_vs_fresh5163_T1"
  node $T/identcmp.mjs id/m_T1.json id/p0_T1.json "p4wl=0_vs_fresh5162_T1"
  node $T/identcmp.mjs id/L_T2.json id/g0_T2.json "wl2g=0_vs_fresh5163_T2"
  node $T/identcmp.mjs id/m_T0.json id/p0_T0.json "p4wl=0_vs_fresh5162_T0phone"
  node $T/identcmp.mjs id/m_T0.json id/on_T0.json "mergedON_vs_fresh5162_T0phone"
  node $T/identcmp.mjs id/L_rel.json id/g0_rel.json "wl2g=0_vs_fresh5163_release0.33"
  node $T/identcmp.mjs id/m_exp.json id/p0_exp.json "p4wl=0_vs_fresh5162_expand2.97"
  node $T/identcmp.mjs id/L_T1.json id/on_T1.json "CONTROL_mergedON_vs_5163_T1"
  node $T/identcmp.mjs id/m_T1.json id/on_T1.json "CONTROL_mergedON_vs_5162_T1"; } > id/ident_summary.txt 2>&1
log ident done
STRICT=1 SLOT_BG=0 MODE= GATE_S=150 node $S run 'judge_wl2:perf-sweep' -- node $T/perfab.mjs perf/sweep.json 8 'http://localhost:5162/?tier=T1' 'http://localhost:5167/?tier=T1' 6 11 > perf/sweep.txt 2>&1
log "perf done $(grep -c VALID perf/sweep.txt)"
C() { local tag=$1; shift; node $S run "judge_wl2:st-$tag" -- node $T/cap.mjs --tier T1 --path fast --frames 120 "$@" --out st/$tag > st/$tag.log 2>&1; log "st $tag $(tail -1 st/$tag.log | cut -c1-90)"; }
C d2_J --port 5167 --rows 380,766 --dsf 2
C d1_J --port 5167 --rows 380,766
R() { local port=$1 tag=$2; shift 2; node $T/rl.mjs --url http://localhost:$port/ --qs 'tier=T1&scale=1' --dpr 2 "$@" --out rl/$tag > rl/$tag.txt 2>&1 & local pid=$!
  for k in {1..150}; do sleep 1; grep -q 'frames' rl/$tag.txt && break; done; sleep 1; kill $pid 2>/dev/null; }
node $S run 'judge_wl2:rl' -- zsh -c "true" ; log rl start
for r in 5162:main_a 5167:wl2_a 5162:main_b 5167:wl2_b 5162:main_c 5167:wl2_c; do
  node $S run "judge_wl2:rl-${r#*:}" -- zsh -c "cd $J; node $T/rl.mjs --frames 150 --rx 0 --ry 440 --rw 480 --rh 180 --url http://localhost:${r%%:*}/ --qs 'tier=T1&scale=1' --dpr 2 --out rl/T1d2_${r#*:} > rl/rl_${r#*:}.txt 2>&1 & pid=\$!; for k in {1..150}; do sleep 1; grep -q 'frames' rl/rl_${r#*:}.txt && break; done; sleep 1; kill \$pid 2>/dev/null; true"
  log "rl ${r#*:} $(tail -1 rl/rl_${r#*:}.txt | cut -c1-120)"; done
for r in 5162:fmain 5167:fwl2; do
  node $S run "judge_wl2:rlfar-${r#*:}" -- zsh -c "cd $J; node $T/rl.mjs --frames 100 --vw 1440 --vh 766 --rx 860 --ry 420 --rw 580 --rh 180 --url http://localhost:${r%%:*}/ --qs 'tier=T1&scale=1' --dpr 2 --out rl/T1d2_${r#*:} > rl/rl_${r#*:}.txt 2>&1 & pid=\$!; for k in {1..150}; do sleep 1; grep -q 'frames' rl/rl_${r#*:}.txt && break; done; sleep 1; kill \$pid 2>/dev/null; true"
  log "rlfar ${r#*:} $(tail -1 rl/rl_${r#*:}.txt | cut -c1-120)"; done
log CHAIN DONE
