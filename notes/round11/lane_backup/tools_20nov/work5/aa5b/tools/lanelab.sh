#!/bin/bash
# (Re)start the AA5b lab on :5194 without watch; rebuilds on every restart.
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5b
for p in $(lsof -nP -tiTCP:5194 -sTCP:LISTEN); do kill $p; done
sleep 0.5
cd /Users/muhamadrifaldi/Library/Caches/retrux-lanes/aa5b/retrux-web
PORT=5194 nohup node hero-lab/serve.mjs --no-watch > $W/lab_5194.log 2>&1 &
for i in {1..80}; do lsof -nP -iTCP:5194 -sTCP:LISTEN >/dev/null && break; sleep 0.25; done
grep -E "build|error|Error" $W/lab_5194.log | tail -3
lsof -nP -iTCP:5194 -sTCP:LISTEN | tail -1
