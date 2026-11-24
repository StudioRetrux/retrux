#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; J=$SP/work_p4/judge_p4orb3
while pgrep -f 'judge_p4orb3/tools/jA.sh' >/dev/null; do sleep 3; done
SLOT_BG=0 node $SP/slot/slot.mjs run 'judge_p4orb3:perf' -- zsh $J/tools/jB.sh > $J/perf/jB.log 2>&1
node $SP/slot/slot.mjs run 'judge_p4orb3:det' -- zsh $J/tools/jC.sh > $J/caps/jC.log 2>&1
