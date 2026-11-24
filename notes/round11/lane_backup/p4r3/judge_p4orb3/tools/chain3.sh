#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; J=$SP/work_p4/judge_p4orb3
# wait (outside the slot) up to 6 min for a 1-min load below 9
for i in $(seq 1 120); do l=$(sysctl -n vm.loadavg | awk '{print $2}'); if (( $(echo "$l < 9" | bc) )); then break; fi; sleep 3; done
echo "start load $(sysctl -n vm.loadavg)"
SLOT_BG=0 node $SP/slot/slot.mjs run 'judge_p4orb3:perf2' -- zsh $J/tools/jE.sh > $J/perf/jE.log 2>&1
