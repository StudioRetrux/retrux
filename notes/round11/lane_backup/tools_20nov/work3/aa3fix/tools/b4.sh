#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
F=$SP/work3/aa3fix; A=$SP/work3/judge/artifacts
CAP=$SP/work3/aa3/tools/cap.mjs
for spec in fast reverse leave; do t0=$(date +%s); node $CAP --port 5181 --out $F/caps/${spec}_far3 --path $spec --frames 240 --rows 380,766 --qs "lktaafar=3"; echo "[b4] $spec $(( $(date +%s) - t0 )) s"; done
t0=$(date +%s); cd $A && node tools/jcap.mjs --case fastrev --out $F/caps/fastrev --variants "far3:5181:lktaafar=3"; echo "[b4] fastrev $(( $(date +%s) - t0 )) s"
