#!/bin/zsh
# (Re)start a lab on :5195 without watch: `lab.sh lane` (my lane) or `lab.sh ref` (the AA3 fixed reference clone). Rebuilds.
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5c
for p in $(lsof -nP -tiTCP:5195 -sTCP:LISTEN); do kill $p; done
sleep 1
if [ "$1" = "ref" ]; then cd $W/ref/retrux-web; else cd /Users/muhamadrifaldi/Library/Caches/retrux-lanes/aa5c/retrux-web; fi
PORT=5195 nohup node hero-lab/serve.mjs --no-watch > $W/lab_5195_$1.log 2>&1 &
for i in {1..60}; do lsof -nP -iTCP:5195 -sTCP:LISTEN >/dev/null && break; sleep 0.25; done
grep -E "build|error|Error" $W/lab_5195_$1.log | tail -3
lsof -nP -iTCP:5195 -sTCP:LISTEN | tail -1 | awk '{print $1,$2,$9}'
