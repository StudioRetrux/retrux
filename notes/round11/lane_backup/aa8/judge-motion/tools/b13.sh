#!/bin/zsh
F=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/fix; T=$F/tools; t0=$(date +%s)
node $T/cap.mjs --port 5196 --path diag --rows 380,766 --frames 120 --qs "ffbd0=8&ffbd1=16" --eval "window.__hero.pipeline.aa.read.uAAKnee.value = 0.5" --out $F/caps/diag_d8_k05 > $F/logs/b13_a.log 2>&1
node $T/cap.mjs --port 5196 --path leave --rows 380,766 --frames 120 --qs "ffbd0=8&ffbd1=16" --out $F/caps/leave_d8 > $F/logs/b13_b.log 2>&1
echo "b13 $(( $(date +%s) - t0 ))s"
