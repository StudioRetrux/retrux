#!/bin/zsh
# wait for the 1-min load < 8 (max ~12 min), then ftime (12 alternations) and rtx (6 cycles), lane :5176 vs :5173, SLOT_BG=0
for i in {1..72}; do l=$(sysctl -n vm.loadavg | awk '{print $2}'); [ ${l%.*} -lt 8 ] && break; sleep 10; done
echo "start $(date +%T) load $(sysctl -n vm.loadavg)"
SLOT_BG=0 node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/slot/slot.mjs run 'p4orb3fix:ftime' -- node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4orb3/tools/b1/ftime.mjs --confs lane=5176,main=5173 --cycles 12 --frames 60 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4orb3/fix/perf/ftime.json
echo "ftime done $(date +%T) load $(sysctl -n vm.loadavg)"
SLOT_BG=0 node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/slot/slot.mjs run 'p4orb3fix:rtx2' -- node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4orb3/tools/b1/rtx.mjs --confs lane=5176,main=5173 --cycles 6 --blockms 2500 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4orb3/fix/perf/rtx2.json
echo "rtx done $(date +%T) load $(sysctl -n vm.loadavg)"
