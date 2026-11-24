#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
W=$SP/work_p4/wl2; S=$SP/slot/slot.mjs; cd $W
until grep -q 'CHAIN DONE' run.log; do sleep 3; done
STRICT=1 SLOT_BG=0 MODE= GATE_S=150 node $S run 'wl2:perf-sweep2' -- node tools/perfab.mjs perf/sweep2.json 4 'http://localhost:5162/?tier=T1' 'http://localhost:5167/?tier=T1' 6 6 > perf/sweep2.txt 2>&1
echo "$(date +%T) perf2 done" >> run.log
