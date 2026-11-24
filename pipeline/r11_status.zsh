#!/bin/zsh
# Round-11 autopilot status: one screen of facts for the heartbeat (read-only, cheap).
#   zsh pipeline/r11_status.zsh
SESS=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b
SP=$SESS/scratchpad
T=$SESS/tasks
WFD=/Users/muhamadrifaldi/.claude/projects/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/subagents/workflows

print "now $(date '+%a %d %b %H:%M')  load $(sysctl -n vm.loadavg | tr -d '{}')  mem-free $(memory_pressure 2>/dev/null | awk -F': ' '/free percentage/{print $2}')  disk-free $(df -h /private/tmp | awk 'NR==2{print $4}')"
IDLE=$(ioreg -c IOHIDSystem | awk '/HIDIdleTime/ {printf "%.0f", $NF/1e9/60; exit}')
print "user idle: ${IDLE} min   slot conf: $(tr -d '\n' < $SP/slot/.slot-conf.json | cut -c1-70)"
print "caffeinate: $(pgrep -x caffeinate >/dev/null && echo on || echo OFF)   power: $(pmset -g batt | head -1 | sed "s/Now drawing from //") $(pmset -g batt | grep -o "[0-9]*%; [a-z]*" | head -1)"
print "listening: $(lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null | awk '/:51[78][0-9] |:3000 /{n=split($9,a,":"); printf "%s(pid %s) ", a[n], $2}')"
print "slot: $(node $SP/slot/slot.mjs status 2>/dev/null | python3 -I -c 'import json,sys; d=json.load(sys.stdin); print("n=%s bg=%s holders=%s" % (d["slots"], d["bg"], [h["label"] for h in d["holders"]]))')"

python3 -I - "$T" "$WFD" <<'EOF'
import json, os, sys, time, glob
T, WFD = sys.argv[1], sys.argv[2]
now = time.time()
STOPPED = {'wylau8ycz', 'wvrwu86uh', 'wolxwo2lk', 'w1wwjhm2u', 'wje1vgdp1', 'w53g414tz', 'w9ah60446', 'wk7e10o8o', 'w70khbyof', 'wmhr1ktok', 'whfnldnng', 'w52gzr1qj', 'w0ug8e3kf', 'wmkcztd8h', 'w135x12dw', 'wtw7a8a92', 'wlrm63fe1', 'wh3e85463', 'wz3axek55', 'wudge82fg', 'wgvdbpnot'}  # paused P2b; current P2b task w9ah60446  # tasks stopped with TaskStop (their output stays empty)
outs = sorted((o for o in glob.glob(os.path.join(T, 'w*.output')) if os.path.basename(o)[:-7] not in STOPPED), key=lambda p: os.stat(p).st_birthtime)
launch = os.stat(outs[-1]).st_birthtime if outs else 0
recent = [o for o in outs if now - os.stat(o).st_birthtime < 12*3600] or outs[-1:]
for w in recent[:-1]:
    tid = os.path.basename(w)[:-7]
    sz = os.path.getsize(w)
    st = 'RUNNING' if sz == 0 else 'COMPLETED %s' % time.strftime('%H:%M', time.localtime(os.path.getmtime(w)))
    txt = open(w, errors='replace').read() if sz else ''
    print(f"workflow task {tid}: {st}  failures: {sum('failed:' in l for l in txt.split(chr(10)))}")
if outs:
    w = outs[-1]
    tid = os.path.basename(w)[:-7]
    size = os.path.getsize(w)
    if size == 0:
        print(f"workflow task {tid}: RUNNING (launched {time.strftime('%H:%M', time.localtime(os.stat(w).st_birthtime))})")
    else:
        s = open(w, errors='replace').read()
        fails = [l for l in s.split('\n') if 'failed:' in l]
        limit = sum('hit your' in l for l in fails)
        net = sum(('ENOTFOUND' in l or "Can't reach" in l or 'ECONN' in l or 'network' in l.lower()) for l in fails)
        other = len(fails) - limit - net
        print(f"workflow task {tid}: COMPLETED {time.strftime('%H:%M', time.localtime(os.path.getmtime(w)))}  size {size}  FAILURES: {len(fails)} (usage-limit {limit}, network {net}, other {other})")
        try:
            d = json.JSONDecoder().raw_decode(s[s.find('{'):])[0]
            for line in d.get('logs', [])[-14:]:
                print('   log:', line.replace('\n', ' ')[:170])
        except Exception as e:
            print('   (could not parse output:', e, ')')
runs = sorted((p for p in glob.glob(os.path.join(WFD, 'wf_*')) if os.path.isdir(p)), key=os.path.getmtime)
def newest(r):
    fs = glob.glob(os.path.join(r, '*'))
    return max([os.path.getmtime(f) for f in fs] or [os.path.getmtime(r)])
for run in [r for r in runs if now - newest(r) < 3*3600] or runs[-1:]:
    started, done = {}, {}
    for l in open(os.path.join(run, 'journal.jsonl'), errors='replace'):
        try:
            d = json.loads(l)
        except Exception:
            continue
        if d.get('type') == 'started':
            started[d['agentId']] = d.get('label')
        elif d.get('agentId'):
            done[d['agentId']] = d.get('type')
    latest = {}
    for aid, label in started.items():  # journal order: the last start of a label is the live attempt
        latest[label] = aid
    print(f"run {os.path.basename(run)}: {len(started)} agent starts ({len(latest)} labels), {len(done)} finished")
    for label, aid in latest.items():
        if aid in done:
            continue
        tp = os.path.join(run, f'agent-{aid}.jsonl')
        if not os.path.exists(tp):
            continue
        if now - os.path.getmtime(tp) > 120 * 60:
            continue  # no write for 2 h: a dead attempt from an earlier launch
        age = (now - os.path.getmtime(tp)) / 60
        with open(tp, 'rb') as fh:
            fh.seek(max(0, os.path.getsize(tp) - 4000))
            tail = fh.read().decode('utf-8', 'replace')
        flag = '  LIMIT-HIT' if 'hit your' in tail else ''
        stale = '  STALE?' if age > 45 else ''
        print(f"   active {label:<22} last write {age:5.1f} min ago{flag}{stale}")
EOF
for l in env hold ice; do
  [[ -d $SP/lanes/$l ]] && print "lane $l: $(git -C $SP/lanes/$l status --short | wc -l | tr -d ' ') changed paths, LOG $(date -r $SP/work/$l/LOG.md '+%H:%M' 2>/dev/null)"
done
