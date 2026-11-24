#!/bin/zsh
# judge_p4atmos heavy jobs: ident (?p4atmos=0 vs :5173), deterministic captures (lane vs MAIN), then one perf A/B (rest), each its own slot run
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
J=$SP/work_p4/judge_p4atmos; cd $J
S() { node $SP/slot/slot.mjs run "$@" }
OFF='p4atmos=0'
echo "$(date +%T) I1 start"
S 'judge_p4atmos:ident1' -- zsh -c "
node tools/identP.mjs --port 5173 --out ident/m_T1.json > ident/m_T1.log 2>&1
node tools/identP.mjs --port 5178 --qs '$OFF' --out ident/off_T1.json > ident/off_T1.log 2>&1
node tools/identP.mjs --port 5173 --mobile --out ident/m_T0.json > ident/m_T0.log 2>&1
node tools/identP.mjs --port 5178 --mobile --qs '$OFF' --out ident/off_T0.json > ident/off_T0.log 2>&1
node tools/identP.mjs --port 5173 --tier T2 --out ident/m_T2.json > ident/m_T2.log 2>&1
node tools/identP.mjs --port 5178 --tier T2 --qs '$OFF' --out ident/off_T2.json > ident/off_T2.log 2>&1
node tools/identP.mjs --port 5173 --qs envlake=plate --out ident/m_plate.json > ident/m_plate.log 2>&1
node tools/identP.mjs --port 5178 --qs 'envlake=plate&$OFF' --out ident/off_plate.json > ident/off_plate.log 2>&1
"
echo "$(date +%T) I1 done"
P06='(()=>{const h=window.__hero;h.debug.pose(\"expand\",0);h.debug.settle(0.1);h.debug.pose(\"expand\",2.97);})()'
P08='(()=>{const h=window.__hero;h.debug.pose(\"release\",0.57);})()'
S 'judge_p4atmos:ident2' -- zsh -c "
node tools/identP.mjs --port 5173 --pre '$P06' --out ident/m_p06.json > ident/m_p06.log 2>&1
node tools/identP.mjs --port 5178 --qs '$OFF' --pre '$P06' --out ident/off_p06.json > ident/off_p06.log 2>&1
node tools/identP.mjs --port 5178 --pre '$P06' --out ident/on_p06.json > ident/on_p06.log 2>&1
node tools/identP.mjs --port 5173 --pre '$P08' --out ident/m_p08.json > ident/m_p08.log 2>&1
node tools/identP.mjs --port 5178 --qs '$OFF' --pre '$P08' --out ident/off_p08.json > ident/off_p08.log 2>&1
node tools/identP.mjs --port 5178 --qs 'atmoswl=0&atmosveil2=0&atmosblue2=0&fogbank=r11' --out ident/sub_T1.json > ident/sub_T1.log 2>&1
node tools/identP.mjs --port 5178 --out ident/on_T1.json > ident/on_T1.log 2>&1
"
echo "$(date +%T) I2 done"
S 'judge_p4atmos:capRest' -- zsh -c "
node tools/cap.mjs 5178 caps/lane_rest tools/plan_rest.json > caps/lane_rest.log 2>&1
node tools/cap.mjs 5173 caps/main_rest tools/plan_rest.json > caps/main_rest.log 2>&1
"
echo "$(date +%T) C1 done"
S 'judge_p4atmos:capHold' -- zsh -c "
node tools/cap.mjs 5178 caps/lane_hold tools/plan_hold.json > caps/lane_hold.log 2>&1
node tools/cap.mjs 5173 caps/main_hold tools/plan_hold.json > caps/main_hold.log 2>&1
"
echo "$(date +%T) C2 done"
# perf: one interleaved A/B (rest, 6 pairs), gated on no other perf holder and 1-min load < 10
for i in $(seq 1 120); do
  st=$(node $SP/slot/slot.mjs status)
  busy=$(print -r -- "$st" | python3 -c "import json,sys; d=json.load(sys.stdin); print(sum(1 for h in d['holders'] if 'perf' in h['label'] or 'ftime' in h['label']))")
  load=$(sysctl -n vm.loadavg | awk '{print $2}')
  if [ "$busy" = "0" ] && [ $(echo "$load < 10" | bc) = 1 ]; then echo "$(date +%T) perf start (load $load)"; break; fi
  [ $((i % 6)) = 1 ] && echo "$(date +%T) perf waiting: holders $busy load $load"
  sleep 5
done
SLOT_BG=0 MODE=rest S 'judge_p4atmos:perf_rest' -- node tools/perfab.mjs perf/ab_rest.json 6 'http://localhost:5173/?tier=T1' 'http://localhost:5178/?tier=T1' 6 > perf/ab_rest.txt 2>&1
echo "$(date +%T) PERF done"
