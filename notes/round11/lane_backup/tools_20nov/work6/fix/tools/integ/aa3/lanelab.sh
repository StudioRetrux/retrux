#!/bin/zsh
# (Re)start the LANE lab on :5181 without watch (edits never reload a running capture); rebuilds on every restart.
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3
for p in $(lsof -nP -tiTCP:5181 -sTCP:LISTEN); do kill $p; done
sleep 1
cd /Users/muhamadrifaldi/Library/Caches/retrux-lanes/aa3/retrux-web
PORT=5181 nohup node hero-lab/serve.mjs --no-watch > $W/lab_5181.log 2>&1 &
for i in {1..40}; do lsof -nP -iTCP:5181 -sTCP:LISTEN >/dev/null && break; sleep 0.25; done
grep -E "build|error|Error" $W/lab_5181.log | tail -3
lsof -nP -iTCP:5181 -sTCP:LISTEN | tail -1
