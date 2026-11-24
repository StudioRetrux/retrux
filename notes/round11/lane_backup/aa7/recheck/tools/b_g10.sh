#!/bin/zsh
# recheck G10: WebKit / Firefox boot + 60 stepped frames on the final :5197 vs BASE :5182, scale 1 and 0.7 (playwright 1.65.1)
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/recheck/tools/fx; export PLAYWRIGHT_BROWSERS_PATH=/Users/muhamadrifaldi/RetruxR11Work/ms-playwright; t0=$(date +%s)
for e in webkit firefox; do for s in 1 0.7; do o=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/recheck/g10/${e}_s$s; mkdir -p $o
  node g10x.mjs --engine $e --outdir $o --scale $s > $o/out.txt 2>&1; echo "$e s$s $(( $(date +%s) - t0 ))s"; done; done
