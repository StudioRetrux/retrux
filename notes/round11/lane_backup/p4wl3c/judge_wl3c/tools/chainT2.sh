#!/bin/zsh
# judge_wl3a timing chain v2: finish the alternating real loops, then the perf A/B once chain S is done (STRICT)
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
J=$SP/work_p4/judge_wl3a; S=$SP/slot/slot.mjs; T=$J/tools; cd $J
log() { echo "$(date +%T) $*" >> $J/run.log; }
rlr() { local b=$1 dpr=$2 tier=$3 port=$4 tag=$5 qs=$6; local q="tier=$tier&scale=1"; [[ -n "$qs" ]] && q="$q&$qs"
  node $S run "judge_wl3a:rl-$b-$tag" -- zsh -c "cd $J; node $T/rl.mjs --frames 150 --rx 0 --ry 440 --rw 480 --rh 180 --url http://localhost:$port/ --qs '$q' --dpr $dpr --out rl/${b}_$tag > rl/${b}_$tag.txt 2>&1 & pid=\$!; for k in {1..150}; do sleep 1; grep -q 'frames' rl/${b}_$tag.txt && break; done; sleep 1; kill \$pid 2>/dev/null; true"
  log "rl ${b}_$tag $(tail -1 rl/${b}_$tag.txt | cut -c1-160)"; }
until ! node $S status | grep -q 'judge_wl3a:rl-a2-M1'; do sleep 2; done
log "CHAIN T2 start"
rlr a2 2 T1 5169 L1; rlr a2 2 T1 5162 M2; rlr a2 2 T1 5169 L2; rlr a2 2 T1 5162 M3; rlr a2 2 T1 5169 L3
log "rl a2 done"
for i in 1 2; do rlr a1 1 T1 5162 M$i; rlr a1 1 T1 5169 L$i; done
for i in 1 2; do rlr t2 2 T2 5162 M$i; rlr t2 2 T2 5169 L$i; done
log "rl a1 t2 done; waiting for chain S before perf"
t0=$(date +%s); until grep -q "CHAIN S DONE" $J/run.log || [ $(( $(date +%s) - t0 )) -gt 900 ]; do sleep 3; done
STRICT=1 SLOT_BG=0 MODE= GATE_S=60 node $S run 'judge_wl3a:perf-sweep' -- node $T/perfab.mjs perf/sweep.json 8 'http://localhost:5162/?tier=T1' 'http://localhost:5169/?tier=T1' 6 9 > perf/sweep.txt 2>&1
log "perf done $(grep -c VALID perf/sweep.txt)"
log "CHAIN T DONE"
