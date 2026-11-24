#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
J=$SP/work_p4/judge_wl3a; S=$SP/slot/slot.mjs; T=$J/tools; cd $J
until grep -q "MORE DONE" $J/run.log; do sleep 2; done
echo "$(date +%T) perf start (non-STRICT: judge_wl3b's chain runs in parallel)" >> $J/run.log
SLOT_BG=0 MODE= GATE_S=10 node $S run 'judge_wl3a:perf-sweep' -- node $T/perfab.mjs perf/sweep.json 8 'http://localhost:5162/?tier=T1' 'http://localhost:5169/?tier=T1' 6 8 > perf/sweep.txt 2>&1
echo "$(date +%T) perf done $(grep -c VALID perf/sweep.txt)" >> $J/run.log
