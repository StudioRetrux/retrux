#!/bin/zsh
# judge p4orb3 batch D: crystal temporal flicker, lane :5176 vs MAIN :5173 (hold + rest, 16 deterministic frames)
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4orb3
D=$J/caps/flick; mkdir -p $D
date +%T
for m in hold rest; do
node $J/tools/flick.mjs --port 5176 --mode $m --frames 16 --out $D --tag lane
node $J/tools/flick.mjs --port 5173 --mode $m --frames 16 --out $D --tag off
done
date +%T
