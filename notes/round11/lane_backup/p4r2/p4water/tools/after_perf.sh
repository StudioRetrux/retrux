#!/bin/zsh
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4water
until grep -q "perf exit" $W/logs/perf3.log; do sleep 2; done
zsh $W/tools/b_pop.sh popP2 "slow_L:slow:" "reverse_L:reverse:" "fast_L:fast:" "diag_L:diag:" "leave_L:leave:" &
sleep 5
zsh $W/tools/b_hold.sh &
wait
echo AFTERPERF_DONE >> $W/logs/pop_batches.log
