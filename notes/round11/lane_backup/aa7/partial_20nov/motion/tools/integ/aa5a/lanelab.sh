#!/bin/zsh
# (Re)start the AA5a lab on :5193 without watch; rebuilds on every restart.
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a
for p in $(lsof -nP -tiTCP:5193 -sTCP:LISTEN); do kill $p; done
sleep 1
cd /Users/muhamadrifaldi/Library/Caches/retrux-lanes/aa5a/retrux-web
PORT=5193 nohup node hero-lab/serve.mjs --no-watch > $W/lab_5193.log 2>&1 &
for i in {1..80}; do lsof -nP -iTCP:5193 -sTCP:LISTEN >/dev/null && break; sleep 0.25; done
grep -E "build|error|Error" $W/lab_5193.log | tail -3
lsof -nP -iTCP:5193 -sTCP:LISTEN | tail -1
