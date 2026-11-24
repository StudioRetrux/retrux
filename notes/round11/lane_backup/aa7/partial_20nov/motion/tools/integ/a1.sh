#!/bin/zsh
# A-1 with glide on: the judge's holdre case (jcap.mjs, unmodified, run in place), AA6 default / ?lktaa=0 twin / ?lkglide=0
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/integ
T=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/artifacts/tools
t0=$(date +%s)
node $T/jcap.mjs --case holdre --out $W/caps/holdre --variants "lane:5196,off:5196:lktaa=0,g0:5196:lkglide=0"
echo "holdre $(( $(date +%s) - t0 ))s"
