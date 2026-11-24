#!/bin/zsh
# judge_wl3c timing chain (alone): real loops T1 DPR 2 (M/L x4 alternated), perf STRICT sweep + rest, real loops T1 DPR 1 (x3), T2 (x2)
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
J=$SP/work_p4/judge_wl3c; S=$SP/slot/slot.mjs; T=$J/tools; cd $J
log() { echo "$(date +%T) $*" >> $J/run.log; }
rlr() { local b=$1 dpr=$2 tier=$3 port=$4 tag=$5 nf=$6; local q="tier=$tier&scale=1"
  node $S run "judge_wl3c:rl-$b-$tag" -- zsh -c "cd $J; node $T/rl.mjs --frames $nf --rx 0 --ry 440 --rw 480 --rh 180 --url http://localhost:$port/ --qs '$q' --dpr $dpr --out rl/${b}_$tag > rl/${b}_$tag.txt 2>&1 & pid=\$!; for k in {1..150}; do sleep 1; grep -q 'frames' rl/${b}_$tag.txt && break; done; sleep 1; kill \$pid 2>/dev/null; true"
  log "rl ${b}_$tag $(tail -1 rl/${b}_$tag.txt | cut -c1-150)"; }
log "CHAIN T start (load $(sysctl -n vm.loadavg))"
for k in 1 2 3 4; do rlr d2 2 T1 5162 M$k 150; rlr d2 2 T1 5169 L$k 150; done
log "RL D2 DONE"
STRICT=1 SLOT_BG=0 MODE= GATE_S=150 node $S run 'judge_wl3c:perf-sweep' -- node $T/perfab.mjs perf/sweep.json 9 'http://localhost:5162/?tier=T1' 'http://localhost:5169/?tier=T1' 6 11 > perf/sweep.txt 2>&1
log "perf sweep done $(grep -c VALID perf/sweep.txt)"
STRICT=1 SLOT_BG=0 MODE=rest GATE_S=150 node $S run 'judge_wl3c:perf-rest' -- node $T/perfab.mjs perf/rest.json 6 'http://localhost:5162/?tier=T1' 'http://localhost:5169/?tier=T1' 6 8 > perf/rest.txt 2>&1
log "perf rest done $(grep -c VALID perf/rest.txt)"
for k in 1 2 3; do rlr d1 1 T1 5162 M$k 200; rlr d1 1 T1 5169 L$k 200; done
log "RL D1 DONE"
for k in 1 2; do rlr t2 2 T2 5162 M$k 150; rlr t2 2 T2 5169 L$k 150; done
log "RL T2 DONE"
log "CHAIN T DONE"
