#!/bin/zsh
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/motion; T=$W/tools; S=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/slot/slot.mjs; C=$W/caps; L=$W/logs
b() { local lab=$1; shift; node $S run "judge8-motion $lab" -- zsh -c "$*" >> $L/cM2.out 2>&1; echo "$(date +%T) $lab done" >> $L/cM2.out; }
b M2 "for p in reverse fast diag leave; do node $T/cap.mjs --port 5199 --path \$p --rows 380,766 --frames 120 --out $C/\${p}_A8 > $L/M2_\$p.log 2>&1; done"
echo "$(date +%T) cM2 end" >> $L/cM2.out
