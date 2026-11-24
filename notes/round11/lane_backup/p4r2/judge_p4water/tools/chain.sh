#!/bin/zsh
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4water
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
cd $J
echo "$(date +%T) start" >> $J/logs/chain.log
node $SP/slot/slot.mjs run 'judge_p4water:identA' -- zsh $J/tools/id_a.sh >> $J/logs/chain.log 2>&1
node $SP/slot/slot.mjs run 'judge_p4water:identB' -- zsh $J/tools/id_b.sh >> $J/logs/chain.log 2>&1
echo "$(date +%T) ident done" >> $J/logs/chain.log
zsh /Users/muhamadrifaldi/RetruxR11Work/hp/qc_r11.zsh $J/qc http://localhost:5177 T1 1 >> $J/logs/qc.log 2>&1
echo "$(date +%T) qc done rc $?" >> $J/logs/chain.log
SLOT_BG=0 node $SP/slot/slot.mjs run 'judge_p4water:perf' -- node $J/tools/rc2h.mjs --vw 1440 --vh 766 --cycles 6 --restcycles 6 --holdcycles 6 --blockms 2500 --confs "lane=5177|tier=T1&scale=1,main=5199|tier=T1&scale=1" --out $J/perf/ab.json > $J/logs/perf.log 2>&1
echo "$(date +%T) perf done rc $?" >> $J/logs/chain.log
