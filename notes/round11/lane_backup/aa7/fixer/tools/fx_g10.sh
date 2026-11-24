#!/bin/zsh
# fixer G10 on the final build (WebKit / Firefox via playwright 1.65.1): boot + 60-frame stepped medium sweep, lane :5197 vs BASE :5182,
# at scale 1 and at render scale 0.7 (?scale=0.7: fix B's row sizing runs)
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/fixer; export PLAYWRIGHT_BROWSERS_PATH=/Users/muhamadrifaldi/RetruxR11Work/ms-playwright; t0=$(date +%s)
for e in webkit firefox; do
  mkdir -p /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/fixer/g10/$e /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/fixer/g10/${e}_s07
  node tools/g10x.mjs --engine $e --outdir /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/fixer/g10/$e > /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/fixer/g10/$e/out.txt 2>&1; echo "$e $(( $(date +%s) - t0 ))s"
  node tools/g10x.mjs --engine $e --outdir /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/fixer/g10/${e}_s07 --scale 0.7 > /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/fixer/g10/${e}_s07/out.txt 2>&1; echo "$e s07 $(( $(date +%s) - t0 ))s"
done
