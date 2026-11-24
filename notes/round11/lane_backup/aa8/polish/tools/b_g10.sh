#!/bin/zsh
# AA8 polish G10: the final build (:5199) and BASE (:5182) in WebKit / Firefox (playwright 1.65.1), boot + 60 stepped medium frames
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/polish; T=$W/tools; t0=$(date +%s)
export PLAYWRIGHT_BROWSERS_PATH=/Users/muhamadrifaldi/RetruxR11Work/ms-playwright
for e in webkit firefox; do mkdir -p $W/g10/$e; node $T/fx/g10x.mjs --engine $e --port 5199 --outdir $W/g10/$e > $W/g10/$e/out.txt 2>&1; echo "$e $(( $(date +%s) - t0 ))s"; done
