#!/bin/zsh
# rejudge_wl2: serial through the slot. real loop T1 DPR 2 (deciding) -> ident (fresh refs) -> STRICT perf DPR 2 -> T2 DPR 2 loop -> rest caps -> 60 fps sparkle -> T1 DPR 1 loop
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
J=$SP/work_p4/rejudge_wl2; S=$SP/slot/slot.mjs; T=$J/tools; cd $J
log() { echo "$(date +%T) $*" >> $J/run.log; }
RL() { local port=$1 tag=$2 qs=$3 dpr=$4
  node $S run "rejudge_wl2:rl-$tag" -- zsh -c "cd $J; node $T/rl.mjs --frames 150 --rx 0 --ry 440 --rw 480 --rh 180 --url http://localhost:$port/ --qs '$qs' --dpr $dpr --out rl/$tag > rl/rl_$tag.txt 2>&1 & pid=\$!; for k in {1..150}; do sleep 1; grep -q 'frames' rl/rl_$tag.txt && break; done; sleep 1; kill \$pid 2>/dev/null; true"
  log "rl $tag $(tail -1 rl/rl_$tag.txt | cut -c1-150)"; }
log "CHAIN start"
for r in 5162:main_a 5167:wl2_a 5162:main_b 5167:wl2_b 5162:main_c 5167:wl2_c; do RL ${r%%:*} T1d2_${r#*:} 'tier=T1&scale=1' 2; done
log "T1d2 DONE"
P() { node $S run "rejudge_wl2:ident" -- node $T/identP.mjs "$@" > /dev/null 2>&1; }
P --port 5162 --out id/m_T1.json; P --port 5167 --qs p4wl=0 --out id/p0_T1.json
P --port 5163 --out id/L_T1.json; P --port 5167 --qs wl2g=0 --out id/g0_T1.json
P --port 5164 --out id/G_T1.json; P --port 5167 --qs wl2fj=0 --out id/f0_T1.json
P --port 5163 --tier T2 --out id/L_T2.json; P --port 5167 --tier T2 --qs wl2g=0 --out id/g0_T2.json
P --port 5162 --mobile --out id/m_T0.json; P --port 5167 --mobile --out id/on_T0.json
P --port 5167 --out id/on_T1.json
{ node $T/identcmp.mjs id/m_T1.json id/p0_T1.json "p4wl=0_vs_fresh5162_T1"
  node $T/identcmp.mjs id/L_T1.json id/g0_T1.json "wl2g=0(all_off)_vs_fresh5163_T1"
  node $T/identcmp.mjs id/G_T1.json id/f0_T1.json "wl2fj=0_vs_fresh5164(prefix_wl2)_T1"
  node $T/identcmp.mjs id/L_T2.json id/g0_T2.json "wl2g=0(all_off)_vs_fresh5163_T2"
  node $T/identcmp.mjs id/m_T0.json id/on_T0.json "wl2ON_vs_fresh5162_T0phone"
  node $T/identcmp.mjs id/m_T1.json id/on_T1.json "CONTROL_wl2ON_vs_5162_T1"
  node $T/identcmp.mjs id/G_T1.json id/on_T1.json "CONTROL_wl2ON_vs_5164_T1"; } > id/ident_summary.txt 2>&1
log "IDENT DONE"
STRICT=1 SLOT_BG=0 MODE= GATE_S=150 node $S run 'rejudge_wl2:perf-sweep-d2' -- node $T/perfab_d2.mjs perf/sweep_d2.json 6 'http://localhost:5162/?tier=T1&scale=1' 'http://localhost:5167/?tier=T1&scale=1' 6 8 > perf/sweep_d2.txt 2>&1
log "PERF DONE $(grep -c VALID perf/sweep_d2.txt)"
for r in 5162:main_a 5167:wl2_a 5162:main_b 5167:wl2_b; do RL ${r%%:*} T2d2_${r#*:} 'tier=T2&scale=1' 2; done
log "T2d2 DONE"
for t in T1 T2; do for r in 5162:main 5167:wl2; do
  node $S run "rejudge_wl2:rest" -- node $T/cap.mjs --port ${r%%:*} --path rest --frames 3 --pre 5 --vw 1440 --vh 766 --dsf 1 --tier $t --out caps/rest_${t}_${r#*:} > caps/rest_${t}_${r#*:}.log 2>&1; done; done
log "REST DONE"
for r in 5162:main 5167:wl2; do
  node $S run "rejudge_wl2:s60" -- zsh -c "LAB=http://localhost:${r%%:*} PREFIX=s CLIP=860,420,580,200 node $T/shoot_ripple.mjs s60/far_${r#*:} 40 0.0166666667 100 > s60/far_${r#*:}.log 2>&1; LAB=http://localhost:${r%%:*} PREFIX=s CLIP=0,430,560,200 node $T/shoot_ripple.mjs s60/left_${r#*:} 40 0.0166666667 100 > s60/left_${r#*:}.log 2>&1"; done
log "S60 DONE"
for r in 5162:main_a 5167:wl2_a 5162:main_b 5167:wl2_b; do RL ${r%%:*} T1d1_${r#*:} 'tier=T1&scale=1' 1; done
log "CHAIN DONE"
