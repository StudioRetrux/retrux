#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
C=$SP/work_p4/wl3c; S=$SP/slot/slot.mjs; T=$C/tools; cd $C
log() { echo "$(date +%T) $*" >> $C/run.log; }
STRICT=1 SLOT_BG=0 MODE= GATE_S=150 node $S run 'wl3c:perf-sweep' -- node $T/perfab.mjs perf/sweep.json 10 'http://localhost:5162/?tier=T1' 'http://localhost:5169/?tier=T1' 6 13 > perf/sweep.txt 2>&1
log "perf sweep done $(grep -c VALID perf/sweep.txt)"
STRICT=1 SLOT_BG=0 MODE=rest GATE_S=150 node $S run 'wl3c:perf-rest' -- node $T/perfab.mjs perf/rest.json 8 'http://localhost:5162/?tier=T1' 'http://localhost:5169/?tier=T1' 6 10 > perf/rest.txt 2>&1
log "perf rest done $(grep -c VALID perf/rest.txt)"
log "CHAIN P DONE"
