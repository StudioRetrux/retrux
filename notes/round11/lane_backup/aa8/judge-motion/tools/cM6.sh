#!/bin/zsh
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/motion; T=$W/tools; S=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/slot/slot.mjs; L=$W/logs
SLOT_BG=0 node $S run "judge8-motion H2" -- zsh -c "SLOT_BG=0 node $T/hitch.mjs --runs a7=5197,a8=5199 --reps 2 --rest 8000 --out $W/ana/hitch2.json > $L/H2.log 2>&1" >> $L/cM6.out 2>&1; echo "$(date +%T) H2 done" >> $L/cM6.out
