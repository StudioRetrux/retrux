#!/bin/zsh
# judge-motion chain A2 (replaces cA after A2; AA6 reverse / fast cloned from judge-artrefl instead): AA7 raw fast (L5 1x rim), real loop, hitch
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/motion; T=$W/tools; S=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/slot/slot.mjs; C=$W/caps; L=$W/logs
b() { local lab=$1; shift; node $S run "judge-motion $lab" -- zsh -c "$*" >> $L/cA.out 2>&1; echo "$(date +%T) $lab done" >> $L/cA.out; }
b A3 "node $T/cap.mjs --port 5197 --path fast --rows 380,766 --frames 120 --qs envedge=0 --out $C/fast_A7raw > $L/A3x.log 2>&1; node $T/rl.mjs --port 5197 --out $C/rl_medium_A7 --path medium --frames 180 > $L/A4a.log 2>&1; node $T/rl.mjs --port 5182 --out $C/rl_medium_base --path medium --frames 180 > $L/A4b.log 2>&1"
b A5 "SLOT_BG=0 node $T/hitch.mjs --runs a7=5197,base=5182 --reps 1 --rest 8000 --out $W/ana/hitch.json > $L/A5.log 2>&1"
echo "$(date +%T) cA end" >> $L/cA.out
