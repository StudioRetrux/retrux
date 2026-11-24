#!/bin/zsh
# judge_wl2 chain 4: STRICT perf A/B at the client's config (T1, 1512x860 DPR 2, scale pinned 1), after chain 3
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
J=$SP/work_p4/judge_wl2; S=$SP/slot/slot.mjs; T=$J/tools; cd $J
until grep -q 'GO4' $J/run.log; do sleep 2; done
STRICT=1 SLOT_BG=0 MODE= GATE_S=150 node $S run 'judge_wl2:perf-sweep-d2' -- node $T/perfab_d2.mjs perf/sweep_d2.json 6 'http://localhost:5162/?tier=T1&scale=1' 'http://localhost:5167/?tier=T1&scale=1' 6 8 > perf/sweep_d2.txt 2>&1
echo "$(date +%T) perf-d2 done $(grep -c VALID perf/sweep_d2.txt)" >> $J/run.log
echo "$(date +%T) CHAIN4 DONE" >> $J/run.log
