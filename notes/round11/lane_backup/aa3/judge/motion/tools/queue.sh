#!/bin/zsh
# sequential slot batches (each batch takes and frees the slot)
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/motion
SL=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/slot/slot.mjs
while pgrep -f "judge-motion:capA" >/dev/null; do sleep 3; done
node $SL run 'judge-motion:capB' -- $J/tools/batch.sh aa3_medium:5181:medium aa3_fast:5181:fast aa3_diag:5181:diag aa3_reverse:5181:reverse aa3_leave:5181:leave >> $J/caps/batchB.log 2>&1
node $SL run 'judge-motion:capC' -- $J/tools/batch.sh base_fast:5182:fast:--mask base_diag:5182:diag:--mask >> $J/caps/batchC.log 2>&1
node $SL run 'judge-motion:capD' -- $J/tools/batch.sh base_reverse:5182:reverse:--mask base_leave:5182:leave:--mask >> $J/caps/batchD.log 2>&1
echo QUEUE-DONE >> $J/caps/queue.log
