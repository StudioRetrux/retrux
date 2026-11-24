#!/bin/zsh
# (Re)start MY lane lab on :5192 without watch; rebuilds on every restart. Never touches other ports.
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work4/aa4y
for p in $(lsof -nP -tiTCP:5192 -sTCP:LISTEN); do kill $p; done
sleep 0.5
cd /Users/muhamadrifaldi/Library/Caches/retrux-lanes/aa4y/retrux-web
PORT=5192 nohup node hero-lab/serve.mjs --no-watch > $W/lab_5192.log 2>&1 &
for i in {1..60}; do lsof -nP -iTCP:5192 -sTCP:LISTEN >/dev/null && break; sleep 0.25; done
grep -E "build|error|Error|serving" $W/lab_5192.log | tail -3
lsof -nP -iTCP:5192 -sTCP:LISTEN | tail -1
