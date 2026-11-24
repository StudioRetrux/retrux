#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; J=$SP/work_p4/judge_wl3a
t0=$(date +%s)
until ! node $SP/slot/slot.mjs status | grep -q 'wl3b:perf-sweep' || [ $(( $(date +%s) - t0 )) -gt 300 ]; do sleep 3; done
echo "$(date +%T) launch (waited $(( $(date +%s) - t0 )) s for wl3b perf)" >> $J/run.log
nohup zsh $J/tools/chainT.sh > $J/chainT.out 2>&1 &
sleep 1; nohup zsh $J/tools/chainS.sh > $J/chainS.out 2>&1 &
