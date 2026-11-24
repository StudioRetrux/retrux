#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/polish; T=$W/tools
node $T/pf/ctxloss.mjs --port 5199 --outdir $W/g10/ctx > $W/g10/ctx/out.txt 2>&1; echo "ctxloss done"
