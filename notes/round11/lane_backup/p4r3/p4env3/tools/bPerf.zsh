#!/bin/zsh
# p4env3 perf: real RAF loop, vsync off, interleaved A (:5173 MAIN = int1) / B (:5174 lane), 6 pairs per mode
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
W=$SP/work_p4/p4env3
cd $W
for mode in ${@:-rest move hold}; do
  m=$mode; [ $mode = move ] && m=""
  echo "$mode start $(date +%T) load $(sysctl -n vm.loadavg)"
  SLOT_BG=0 MODE=$m node $SP/slot/slot.mjs run "p4env3:perf_$mode" -- node tools/perfab.mjs perf/ab_$mode${RUN:-}.json 6 'http://localhost:5173/?tier=T1' 'http://localhost:5174/?tier=T1' 6 > perf/ab_$mode${RUN:-}.txt 2>&1
done
echo PERF done $(date +%T)
