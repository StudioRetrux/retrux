#!/bin/zsh
# judge-artifacts capture batches (each its own slot hold)
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/artifacts
S=../../../slot/slot.mjs
run() { local label=$1; shift; echo "== $label $(date +%T)"; node $S run "judge-artifacts:$label" -- node tools/jcap.mjs "$@" 2>&1 | grep -v '^\[slot\]'; }
run fastrev --case fastrev --out caps/fastrev --variants "base:5182:mask,lane:5181,off:5181:lktaa=0"
run holdre-b --case holdre --out caps/holdre --variants "base:5182:mask"
run holdre-l --case holdre --out caps/holdre --variants "lane:5181,off:5181:lktaa=0"
run resize --case resize --out caps/resize --variants "base:5182:mask,lane:5181,off:5181:lktaa=0"
run gov --case gov --out caps/gov --variants "base:5182:mask,lane:5181,off:5181:lktaa=0"
run tab --case tab --out caps/tab --variants "base:5182:mask,lane:5181,off:5181:lktaa=0"
run leavere --case leavere --out caps/leavere --variants "base:5182:mask,lane:5181" --rows 300,766
echo "== done $(date +%T)"
