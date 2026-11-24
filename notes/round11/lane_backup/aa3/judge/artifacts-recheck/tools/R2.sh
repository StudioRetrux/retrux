#!/bin/zsh
# recheck A-2 / G4: gov + fastrev
T=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/artifacts/tools; C=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/artifacts-recheck/caps
node $T/jcap.mjs --case gov --out $C/gov --variants "lane:5181,off:5181:lktaa=0"
node $T/jcap.mjs --case fastrev --out $C/fastrev --variants "lane:5181,off:5181:lktaa=0"
