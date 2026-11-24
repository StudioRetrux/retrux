#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; J=$SP/work_p4/judge_p4orb3
while pgrep -f 'judge_p4orb3/tools/chain4.sh' >/dev/null; do sleep 3; done
for i in $(seq 1 60); do l=$(sysctl -n vm.loadavg | awk '{print $2}'); if (( $(echo "$l < 9" | bc) )); then break; fi; sleep 3; done
echo "start load $(sysctl -n vm.loadavg)"
SLOT_BG=0 node $SP/slot/slot.mjs run 'judge_p4orb3:perfrest' -- zsh $J/tools/jG.sh > $J/perf/jG.log 2>&1
