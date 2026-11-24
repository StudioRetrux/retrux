#!/bin/zsh
# fixer batch 5: knee attribution: the fixed AA6 with the knee set back to 0.5 live (before the settle), medium 240
F=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/fix; T=$F/tools; t0=$(date +%s)
node $T/cap.mjs --port 5196 --path medium --rows 380,766 --frames 240 --eval "window.__hero.pipeline.aa.read.uAAKnee.value = 0.5" --out $F/caps/medium_A6n_k05 > $F/logs/b5.log 2>&1
echo "b5 $(( $(date +%s) - t0 ))s"
