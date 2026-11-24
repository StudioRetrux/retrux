#!/bin/zsh
# judge-motion chain Z (after chain Y): real rAF loop with CDP mouse (rl.mjs medium 180 f: a7, a6, base) + first-motion hitch (a7 / base)
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/motion; T=$W/tools; S=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/slot/slot.mjs; C=$W/caps; L=$W/logs
until grep -q "chainY end" $L/chainY.out 2>/dev/null; do sleep 5; done
b() { local lab=$1; shift; node $S run "judge-motion $lab" -- zsh -c "$*" >> $L/chainZ.out 2>&1; echo "$(date +%T) $lab done" >> $L/chainZ.out; }
b Z1 "node $T/rl.mjs --port 5197 --out $C/rl_medium_A7 --path medium --frames 180 > $L/Z1a.log 2>&1; node $T/rl.mjs --port 5196 --out $C/rl_medium_A6 --path medium --frames 180 > $L/Z1b.log 2>&1; node $T/rl.mjs --port 5182 --out $C/rl_medium_base --path medium --frames 180 > $L/Z1c.log 2>&1"
b Z2 "SLOT_BG=0 node $T/hitch.mjs --runs a7=5197,base=5182 --reps 1 --rest 8000 --out $W/ana/hitch.json > $L/Z2.log 2>&1"
echo "$(date +%T) chainZ end" >> $L/chainZ.out
