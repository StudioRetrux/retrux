#!/bin/zsh
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/motion; T=$W/tools; S=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/slot/slot.mjs; C=$W/caps; L=$W/logs
b() { local lab=$1; shift; node $S run "judge8-motion $lab" -- zsh -c "$*" >> $L/cM1.out 2>&1; echo "$(date +%T) $lab done" >> $L/cM1.out; }
b M1 "node $T/cap.mjs --port 5199 --path medium --rows 380,766 --frames 240 --out $C/medium_A8 > $L/M1m.log 2>&1; node $T/cap.mjs --port 5199 --path slow --rows 380,766 --frames 160 --out $C/slow_A8 > $L/M1s.log 2>&1"
echo "$(date +%T) cM1 end" >> $L/cM1.out
