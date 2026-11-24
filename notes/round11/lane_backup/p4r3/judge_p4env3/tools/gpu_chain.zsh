#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
J=$SP/work_p4/judge_p4env3
until grep -q PERFDONE $J/perf/wait.log; do sleep 3; done
echo "gpuab rest start $(date +%T) load $(sysctl -n vm.loadavg)"
SLOT_BG=0 node $SP/slot/slot.mjs run 'judge_p4env3:perf_gpuab' -- node $J/tools/gpuab.mjs $J/perf/gpuab_rest.json 'http://localhost:5173/?tier=T1&scale=1&debug=1' 'http://localhost:5174/?tier=T1&scale=1&debug=1' 40 8 rest
echo "gpuab crack start $(date +%T) load $(sysctl -n vm.loadavg)"
SLOT_BG=0 node $SP/slot/slot.mjs run 'judge_p4env3:perf_gpuab2' -- node $J/tools/gpuab.mjs $J/perf/gpuab_crack.json 'http://localhost:5174/?tier=T1&scale=1&debug=1&p4crack=0' 'http://localhost:5174/?tier=T1&scale=1&debug=1' 40 8 rest
echo "GPUDONE $(date +%T)"
