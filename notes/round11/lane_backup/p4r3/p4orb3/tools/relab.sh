#!/bin/zsh
# restart this lane's lab (:5176, started by p4orb3) and wait for the build
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; WORK=$SP/work_p4/p4orb3
pid=$(lsof -nP -iTCP:5176 -sTCP:LISTEN -t 2>/dev/null)
[ -n "$pid" ] && kill $pid && sleep 1
cd /Users/muhamadrifaldi/RetruxR11Work/lanes/p4orb3/retrux-web && PORT=5176 nohup node hero-lab/serve.mjs --no-watch > $WORK/lab.log 2>&1 &
for i in {1..60}; do grep -q "serving hero lab\|error\|Error" $WORK/lab.log 2>/dev/null && break; sleep 1; done
tail -4 $WORK/lab.log
