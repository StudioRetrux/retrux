#!/bin/zsh
# judge_wl2g perf: T1 pointer sweep, STRICT interleaved A/B, A = :5162 (MAIN water), B = :5164 (lane), want 8 valid pairs (max 12).
# Starts after chain A's real loop AND after the hold captures, then waits (max 6 min) until no other lane's perf job holds a slot.
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
J=$SP/work_p4/judge_wl2g; S=$SP/slot/slot.mjs
until grep -q RLDONE $J/chainA.log 2>/dev/null && grep -q HOLDDONE $J/hold/run.log 2>/dev/null; do sleep 5; done
t0=$(date +%s)
while node $S status | python3 -c "import json,sys;d=json.load(sys.stdin);sys.exit(0 if any('perf' in h['label'] for h in d['holders']) else 1)" && (( $(date +%s) - t0 < 360 )); do sleep 5; done
echo "$(date +%T) perf start (waited $(( $(date +%s) - t0 )) s for other perf jobs)" >> $J/chainA.log
cd $J; STRICT=1 SLOT_BG=0 GATE_S=200 DEADLINE=$(( ($(date +%s) + 16 * 60) * 1000 )) node $S run '!judge_wl2g:perf-sweep' -- node $J/tools/perfab.mjs $J/perf/sweep.json 8 "http://localhost:5162/?tier=T1" "http://localhost:5164/?tier=T1" 6 12 > $J/perf/sweep.txt 2>&1
echo "$(date +%T) PERFDONE" >> $J/chainA.log
