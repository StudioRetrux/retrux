#!/bin/zsh
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/artifacts-recheck; O=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/artifacts/caps; T=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/artifacts/tools
node $T/jana.mjs --base $O/tab/base --lane caps/tab/lane --off caps/tab/off --out ana/tab.json > ana/tab.txt 2>&1 &
node $T/jana.mjs --base $O/resize/base --lane caps/resize/lane --off caps/resize/off --out ana/resize.json > ana/resize.txt 2>&1 &
node $T/jana.mjs --base $O/resize/base_s1 --lane caps/resize/lane_s1 --off caps/resize/off_s1 --out ana/resize_s1.json > ana/resize_s1.txt 2>&1 &
node $T/jana.mjs --base $O/resize/base_s2 --lane caps/resize/lane_s2 --off caps/resize/off_s2 --out ana/resize_s2.json > ana/resize_s2.txt 2>&1 &
node $T/jana.mjs --base $O/dpr2/base --lane caps/dpr2/lane --off caps/dpr2/off --out ana/dpr2.json > ana/dpr2.txt 2>&1 &
wait
echo ANA-R4-DONE
