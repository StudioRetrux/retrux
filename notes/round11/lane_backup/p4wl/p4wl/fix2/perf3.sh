#!/bin/zsh
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4wl; S=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/slot/slot.mjs
cd $W
STRICT=1 SLOT_BG=0 MODE= node $S run 'p4wl:perf-sweep' -- node tools/perfab.mjs perf/x_sweep.json 8 "http://localhost:5162/?tier=T1" "http://localhost:5163/?tier=T1" 6 9 > perf/x_sweep.txt 2>&1
STRICT=1 SLOT_BG=0 MODE=rest node $S run 'p4wl:perf-rest' -- node tools/perfab.mjs perf/x_rest.json 6 "http://localhost:5162/?tier=T1" "http://localhost:5163/?tier=T1" 6 9 > perf/x_rest.txt 2>&1
STRICT=1 SLOT_BG=0 MODE= node $S run 'p4wl:perf-T2' -- node tools/perfab.mjs perf/x_sweepT2.json 4 "http://localhost:5162/?tier=T2" "http://localhost:5163/?tier=T2" 6 6 > perf/x_sweepT2.txt 2>&1
echo done > perf/X_DONE
