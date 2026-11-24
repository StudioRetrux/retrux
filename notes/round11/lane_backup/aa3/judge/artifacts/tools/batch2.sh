#!/bin/zsh
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/artifacts
S=../../../slot/slot.mjs
T=../../aa3/tools
echo "== slowdet $(date +%T)"
node $S run "judge-artifacts:slowdet" -- node $T/cap.mjs --port 5181 --out caps/slowdet_F --path slow --frames 6 --rows 380,766 2>&1 | grep -v '^\[slot\]'
echo "== rest $(date +%T)"
node $S run "judge-artifacts:rest" -- node tools/jcap.mjs --case rest --out caps/rest --pre 30 --variants "base:5182:mask,lane:5181,aa0:5181:aaresolve=0,off:5181:lktaa=0" --eval2 "__hero.debug.freeze(true); __hero.lakeSched && __hero.lakeSched.invalidate()" 2>&1 | grep -v '^\[slot\]'
echo "== dpr2 $(date +%T)"
node $S run "judge-artifacts:dpr2" -- node tools/jcap.mjs --case dpr2 --out caps/dpr2 --dsf 2 --rows 430,766 --variants "base:5182:mask,lane:5181,off:5181:lktaa=0" 2>&1 | grep -v '^\[slot\]'
echo "== done $(date +%T)"
