#!/bin/zsh
# wl3a: the deciding real loops (alternating MAIN / lane) then the STRICT perf A/B; run when nothing else of mine runs
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
W=$SP/work_p4/wl3a; S=$SP/slot/slot.mjs; T=$W/tools; cd $W
log() { echo "$(date +%T) $*" >> $W/gates.log; }
$T/rlb.sh e2 2 T1 5162:M1 5169:L1 5162:M2 5169:L2 5162:M3 5169:L3 5162:M4 5169:L4; log "rl e2 done"
$T/rlb.sh e1 1 T1 5162:M1 5169:L1 5162:M2 5169:L2 5162:M3 5169:L3; log "rl e1 done"
$T/rlb.sh t2 2 T2 5162:M1 5169:L1 5162:M2 5169:L2 5162:M3 5169:L3; log "rl t2 done"
STRICT=1 SLOT_BG=0 MODE= GATE_S=150 node $S run 'wl3a:perf-sweep' -- node $T/perfab.mjs perf/sweep.json 10 'http://localhost:5162/?tier=T1' 'http://localhost:5169/?tier=T1' 6 14 > perf/sweep.txt 2>&1
log "perf done $(grep -c VALID perf/sweep.txt)"
log "CHAIN R DONE"
