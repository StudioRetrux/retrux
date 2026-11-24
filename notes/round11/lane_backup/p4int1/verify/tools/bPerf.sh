#!/bin/zsh
# verify_int1 perf re-measure: int1's perfab (real RAF loop, vsync off), A = :5199 MAIN, B = :5173 int1, interleaved, 6 pairs per mode, SLOT_BG=0
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
V=$SP/work_p4/verify_int1
cd $V
for mode in ${@:-rest move hold}; do
  for i in $(seq 1 60); do   # wait (max 5 min) until no other perf/timing holder and load < 9
    st=$(node $SP/slot/slot.mjs status)
    busy=$(print -r -- "$st" | python3 -c "import json,sys; d=json.load(sys.stdin); print(sum(1 for h in d['holders'] if 'perf' in h['label'] or 'ftime' in h['label'] or 'rc2' in h['label']))")
    load=$(sysctl -n vm.loadavg | awk '{print $2}')
    if [ "$busy" = "0" ] && [ $(echo "$load < 9" | bc) = 1 ]; then break; fi
    sleep 5
  done
  echo "$(date +%T) $mode start (load $load, other perf holders $busy, holders: $(print -r -- "$st" | python3 -c "import json,sys; print([h['label'] for h in json.load(sys.stdin)['holders']])"))"
  m=$mode; [ $mode = move ] && m=""
  SLOT_BG=0 MODE=$m node $SP/slot/slot.mjs run "verify_int1:perf_$mode" -- node tools/perfab.mjs perf/ab_$mode.json 6 'http://localhost:5199/?tier=T1' 'http://localhost:5173/?tier=T1' 6 > perf/ab_$mode.txt 2>&1
  echo "$(date +%T) $mode done"
done
echo PERF DONE
