#!/bin/zsh
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/motion
SL=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/slot/slot.mjs
until grep -q QUEUE2-DONE $J/caps/queue.log 2>/dev/null; do sleep 3; done
node $SL run 'judge-motion:gt-reverse' -- $J/tools/batchG.sh >> $J/caps/batchG.log 2>&1
echo QUEUE3-DONE >> $J/caps/queue.log
