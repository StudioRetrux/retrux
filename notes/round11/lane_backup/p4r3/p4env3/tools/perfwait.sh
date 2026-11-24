#!/bin/zsh
# wait (max 25 min) until no other lane holds a slot for a perf / timing run and the 1-min load is < 8, then run bPerf.sh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
W=$SP/work_p4/int1
for i in $(seq 1 300); do
  st=$(node $SP/slot/slot.mjs status)
  busy=$(print -r -- "$st" | python3 -c "import json,sys; d=json.load(sys.stdin); print(sum(1 for h in d['holders'] if 'perf' in h['label'] or 'ftime' in h['label'] or 'rc2' in h['label']))")
  load=$(sysctl -n vm.loadavg | awk '{print $2}')
  if [ "$busy" = "0" ] && [ $(echo "$load < 8" | bc) = 1 ]; then echo "$(date +%T) start (load $load)"; break; fi
  [ $((i % 6)) = 1 ] && echo "$(date +%T) waiting: perf holders $busy load $load"
  sleep 5
done
zsh $W/tools/bPerf.sh "$@"
