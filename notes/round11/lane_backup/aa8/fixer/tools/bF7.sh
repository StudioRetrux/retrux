#!/bin/zsh
# AA8 fixer batch F7 (FINAL build): the perf judge's live-loop context loss / restore (own rAF, CDP mouse; lane :5199 vs BASE :5182)
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/fixer; t0=$(date +%s)
cd $W && node $W/tools/pf/ctxloss.mjs --port 5199 --outdir $W/ctx/live > $W/ana/ctxloss_live.txt 2> $W/logs/ctxloss_live.err; echo "F7 $(( $(date +%s) - t0 ))s"
