#!/bin/zsh
S=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/slot/slot.mjs; W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/artifacts-recheck
for b in R5 R4 R6; do echo "== $b $(date +%T)"; node $S run "judge-artifacts-recheck:$b" -- zsh $W/tools/$b.sh 2>&1 | grep -v waiting; echo "== $b done $(date +%T)"; done
