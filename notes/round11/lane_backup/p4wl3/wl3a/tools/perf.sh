#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
W=$SP/work_p4/wl2/fix; S=$SP/slot/slot.mjs; T=$W/tools; cd $W
until grep -q 'GATES DONE' $W/run.log; do sleep 3; done
echo "$(date +%T) perf start" >> run.log
STRICT=1 SLOT_BG=0 MODE= GATE_S=150 node $S run 'wl2fix:perf-sweep' -- node $T/perfab.mjs perf/sweep.json 10 'http://localhost:5162/?tier=T1' 'http://localhost:5167/?tier=T1' 6 12 > perf/sweep.txt 2>&1
echo "$(date +%T) perf sweep done $(grep -c VALID perf/sweep.txt)" >> run.log
STRICT=1 SLOT_BG=0 MODE= GATE_S=150 node $S run 'wl2fix:perf-sweep-d2' -- node $T/perfab_d2.mjs perf/sweep_d2.json 6 'http://localhost:5162/?tier=T1&scale=1' 'http://localhost:5167/?tier=T1&scale=1' 6 8 > perf/sweep_d2.txt 2>&1
echo "$(date +%T) PERF DONE" >> run.log
