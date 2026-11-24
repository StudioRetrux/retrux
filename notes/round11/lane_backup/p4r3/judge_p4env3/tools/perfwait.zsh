#!/bin/zsh
# judge_p4env3: wait (max ~22 min) until no other slot holder runs a perf / timing job and the 1-min load < 8, then REST (and MOVE) A/B
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
J=$SP/work_p4/judge_p4env3
for i in $(seq 1 260); do
  st=$(node $SP/slot/slot.mjs status)
  busy=$(print -r -- "$st" | python3 -c "import json,sys; d=json.load(sys.stdin); print(sum(1 for h in d['holders'] if any(k in h['label'] for k in ('perf','ftime','timing','rc2','fps'))))")
  load=$(sysctl -n vm.loadavg | awk '{print $2}')
  if [ "$busy" = "0" ] && [ $(echo "$load < 8" | bc) = 1 ]; then echo "$(date +%T) start (load $load)"; break; fi
  [ $((i % 6)) = 1 ] && echo "$(date +%T) waiting: perf holders $busy load $load"
  sleep 5
done
for mode in ${@:-rest}; do
  m=$mode; [ $mode = move ] && m=""
  echo "$mode start $(date +%T) load $(sysctl -n vm.loadavg)"
  SLOT_BG=0 MODE=$m node $SP/slot/slot.mjs run "judge_p4env3:perf_$mode" -- node $J/tools/perfab_env3.mjs $J/perf/ab_$mode.json 6 'http://localhost:5173/?tier=T1' 'http://localhost:5174/?tier=T1' 6 > $J/perf/ab_$mode.txt 2>&1
  echo "$mode done $(date +%T)"
done
echo PERFDONE $(date +%T)
