#!/bin/zsh
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/artifacts
S=../../../slot/slot.mjs
T=../../aa3/tools
echo "== reverse lane $(date +%T)"
node $S run "judge-artifacts:reverse" -- zsh -c "node $T/cap.mjs --port 5181 --out caps/reverse_F --path reverse --frames 240 --rows 380,766; node $T/cap.mjs --port 5181 --out caps/reverse_sf0 --path reverse --frames 240 --rows 380,766 --qs slabflash=0" 2>&1 | grep -v '^\[slot\]'
echo "== done $(date +%T)"
