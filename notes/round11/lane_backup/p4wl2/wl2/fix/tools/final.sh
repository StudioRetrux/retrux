#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
W=$SP/work_p4/wl2/fix; S=$SP/slot/slot.mjs; T=$W/tools; cd $W
log() { echo "$(date +%T) $*" >> $W/run.log; }
log FINAL start
# far real loop T1 DPR 2 (the judge's FJ3 setup)
for r in 5162:fmain 5167:ffix 5162:fmain2 5167:ffix2; do
  node $S run "wl2fix:rlfar-${r#*:}" -- zsh -c "cd $W; node $T/rl.mjs --frames 100 --vw 1440 --vh 766 --rx 860 --ry 420 --rw 580 --rh 180 --url http://localhost:${r%%:*}/ --qs 'tier=T1&scale=1' --dpr 2 --out rl/T1d2_${r#*:} > rl/rl_${r#*:}.txt 2>&1 & pid=\$!; for k in {1..150}; do sleep 1; grep -q 'frames' rl/rl_${r#*:}.txt && break; done; sleep 1; kill \$pid 2>/dev/null; true"
  log "rlfar ${r#*:} $(tail -1 rl/rl_${r#*:}.txt | cut -c1-120)"; done
# near real loop T1 DPR 1
zsh $T/rlchain.sh 1 e1 '5162:main_a:' '5167:fix_a:' '5162:main_b:' '5167:fix_b:'
log "perf start"
STRICT=1 SLOT_BG=0 MODE= GATE_S=150 node $S run 'wl2fix:perf-sweep' -- node $T/perfab.mjs perf/sweep.json 9 'http://localhost:5162/?tier=T1' 'http://localhost:5167/?tier=T1' 6 11 > perf/sweep.txt 2>&1
log "perf done $(grep -c VALID perf/sweep.txt)"
P() { node $S run "wl2fix:ident" -- node $T/identP.mjs "$@" > /dev/null 2>&1; }
Q() { node $S run "wl2fix:ident" -- node $T/identPose.mjs "$@" > /dev/null 2>&1; }
mkdir -p idF
P --port 5167 --qs wl2g=0 --out idF/g0_T1.json; P --port 5167 --qs p4wl=0 --out idF/p0_T1.json; P --port 5167 --qs wl2fj=0 --out idF/f0_T1.json
P --port 5167 --tier T2 --qs wl2g=0 --out idF/g0_T2.json; P --port 5167 --tier T2 --qs wl2fj=0 --out idF/f0_T2.json
P --port 5167 --mobile --out idF/on_T0.json; P --port 5167 --mobile --qs p4wl=0 --out idF/p0_T0.json
Q --port 5167 --qs wl2g=0 --pose release,0.33 --out idF/g0_rel.json; Q --port 5167 --qs p4wl=0 --pose expand,2.97 --out idF/p0_exp.json; Q --port 5167 --qs wl2fj=0 --pose expand,0.9 --out idF/f0_p04.json
P --port 5167 --out idF/on_T1.json
{ node $T/identcmp.mjs id/L_T1.json idF/g0_T1.json "wl2g=0(all off)_vs_5163_T1"
  node $T/identcmp.mjs id/m_T1.json idF/p0_T1.json "p4wl=0_vs_5162_T1"
  node $T/identcmp.mjs id/G_T1.json idF/f0_T1.json "wl2fj=0_vs_5164(prefix)_T1"
  node $T/identcmp.mjs id/L_T2.json idF/g0_T2.json "wl2g=0(all off)_vs_5163_T2"
  node $T/identcmp.mjs id/G_T2.json idF/f0_T2.json "wl2fj=0_vs_5164(prefix)_T2"
  node $T/identcmp.mjs id/m_T0.json idF/p0_T0.json "p4wl=0_vs_5162_T0phone"
  node $T/identcmp.mjs id/m_T0.json idF/on_T0.json "ON_vs_5162_T0phone"
  node $T/identcmp.mjs id/L_rel.json idF/g0_rel.json "wl2g=0_vs_5163_release0.33"
  node $T/identcmp.mjs id/m_exp.json idF/p0_exp.json "p4wl=0_vs_5162_expand2.97"
  node $T/identcmp.mjs id/G_p04.json idF/f0_p04.json "wl2fj=0_vs_5164_expand0.9"
  node $T/identcmp.mjs id/G_T1.json idF/on_T1.json "CONTROL_ON_vs_5164_T1"; } > idF/ident_summary.txt 2>&1
log "FINAL DONE"
