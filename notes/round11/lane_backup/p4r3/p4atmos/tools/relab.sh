#!/bin/zsh
# restart my own lab on :5178 (rebuilds from source)
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
W=$SP/work_p4/p4atmos
PID=$(lsof -nP -iTCP:5178 -sTCP:LISTEN -t)
if [ -n "$PID" ]; then
  CWD=$(lsof -a -p $PID -d cwd -Fn | grep '^n' | cut -c2-)
  if [[ "$CWD" == *"/lanes/p4atmos/retrux-web"* || "$CWD" == *"retrux-lanes/p4atmos/retrux-web"* ]]; then kill $PID; sleep 1; else echo "not mine: $CWD"; exit 1; fi
fi
cd /Users/muhamadrifaldi/RetruxR11Work/lanes/p4atmos/retrux-web && PORT=5178 nohup node hero-lab/serve.mjs --no-watch > $W/lab.log 2>&1 &
for i in {1..90}; do sleep 2; if grep -q "build ok\|error\|Error" $W/lab.log; then break; fi; done
tail -3 $W/lab.log
