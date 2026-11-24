#!/bin/zsh
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/motion
SL=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/slot/slot.mjs
while ! grep -q QUEUE-DONE $J/caps/queue.log 2>/dev/null; do sleep 3; done
node $SL run 'judge-motion:capE-gt' -- $J/tools/batchE.sh >> $J/caps/batchE.log 2>&1
node $SL run 'judge-motion:realloop' -- $J/tools/batchF.sh >> $J/rl/batchF.log 2>&1
echo QUEUE2-DONE >> $J/caps/queue.log
