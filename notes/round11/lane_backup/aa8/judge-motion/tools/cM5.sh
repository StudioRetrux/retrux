#!/bin/zsh
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/motion; T=$W/tools; S=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/slot/slot.mjs; C=$W/caps; L=$W/logs
b() { local lab=$1; shift; node $S run "judge8-motion $lab" -- zsh -c "$*" >> $L/cM5.out 2>&1; echo "$(date +%T) $lab done" >> $L/cM5.out; }
b R2 "node $T/rl.mjs --port 5199 --out $C/rl2_medium_A8 --path medium --frames 180 > $L/R2a.log 2>&1; node $T/rl.mjs --port 5197 --out $C/rl2_medium_A7 --path medium --frames 180 > $L/R2b.log 2>&1"
cd $T; nice -n 10 node rlana.mjs --mask /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/motion/caps/base_medium $C/rl2_medium_A8 $C/rl2_medium_A7 > $W/ana/g6_rl2_medium.txt 2>&1; echo "$(date +%T) rlana2" >> $L/cM5.out
