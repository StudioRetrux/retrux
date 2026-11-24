#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; J=$SP/work_p4/judge_p4orb3
while pgrep -f 'judge_p4orb3/tools/chain5.sh' >/dev/null; do sleep 3; done
SLOT_BG=0 node $SP/slot/slot.mjs run 'judge_p4orb3:ftime2' -- zsh $J/tools/jH.sh > $J/perf/jH.log 2>&1
