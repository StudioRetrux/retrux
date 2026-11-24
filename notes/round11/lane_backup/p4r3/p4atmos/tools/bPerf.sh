#!/bin/zsh
# p4atmos perf: real RAF loop, vsync off, interleaved A (:5173 MAIN = int1) / B (:5178 lane), 6 pairs per mode; each mode its own slot
# run, started only when no other lane holds a slot for a perf / timing run and the 1-min load is < 8.
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
W=$SP/work_p4/p4atmos
cd $W; mkdir -p perf
for mode in ${@:-rest move hold}; do
  for i in $(seq 1 240); do
    st=$(node $SP/slot/slot.mjs status)
    busy=$(print -r -- "$st" | python3 -c "import json,sys; d=json.load(sys.stdin); print(sum(1 for h in d['holders'] if 'perf' in h['label'] or 'ftime' in h['label']))")
    load=$(sysctl -n vm.loadavg | awk '{print $2}')
    if [ "$busy" = "0" ] && [ $(echo "$load < 8" | bc) = 1 ]; then echo "$(date +%T) $mode start (load $load)"; break; fi
    [ $((i % 6)) = 1 ] && echo "$(date +%T) $mode waiting: perf holders $busy load $load"
    sleep 5
  done
  m=$mode; [ $mode = move ] && m=""
  SLOT_BG=0 MODE=$m node $SP/slot/slot.mjs run "p4atmos:perf_$mode" -- node tools/perfab.mjs perf/ab_$mode${RUN:-}.json 6 'http://localhost:5173/?tier=T1' 'http://localhost:5178/?tier=T1' 6 > perf/ab_$mode${RUN:-}.txt 2>&1
done
echo PERF done
