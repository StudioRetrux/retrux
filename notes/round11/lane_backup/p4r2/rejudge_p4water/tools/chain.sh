#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
R=$SP/work_p4/rejudge_p4water; J=$SP/work_p4/judge_p4water; W=$SP/work_p4/p4water; L=$R/logs/chain.log
V=/Users/muhamadrifaldi/RetruxR11Work/hp/validate
echo "$(date +%T) start" >> $L
node $SP/slot/slot.mjs run 'rejudge_p4water:ident' -- zsh -c "
 run() { node $J/tools/identS.mjs \"\$@\" > /dev/null 2>> $R/logs/ident.err; echo \"\$(date +%T) done \$*\" >> $R/logs/ident.log; }
 run --port 5177 --qs 'p4water=0' --out $R/ident/l_off_t1.json
 run --port 5199 --out $R/ident/m_t1.json
 run --port 5177 --qs 'p4water=0' --pre \"__hero.debug.pose('expand', 2.97)\" --out $R/ident/l_off_hold.json
 run --port 5199 --pre \"__hero.debug.pose('expand', 2.97)\" --out $R/ident/m_hold.json
 run --port 5177 --pre \"__hero.debug.pose('expand', 2.97)\" --out $R/ident/l_def_hold.json
 run --port 5177 --out $R/ident/l_def_t1.json" >> $L 2>&1
echo "$(date +%T) ident done" >> $L
node $SP/slot/slot.mjs run 'rejudge_p4water:hold' -- zsh -c "
 node $W/tools/pop/cap.mjs --port 5177 --path hold --rows 380,766 --frames 480 --out $R/caps/hold_R > $R/logs/cap_hold_R.log 2>&1; echo \"cap hold_R rc \$? \$(date +%T)\" >> $L
 node $W/tools/pop/cap.mjs --port 5177 --path hold --rows 380,766 --frames 480 --qs 'p4water=0' --out $R/caps/hold_O > $R/logs/cap_hold_O.log 2>&1; echo \"cap hold_O rc \$? \$(date +%T)\" >> $L" >> $L 2>&1
node $SP/slot/slot.mjs run 'rejudge_p4water:w1' -- zsh -c "
 export LAB=http://localhost:5177
 for i in 1 2; do
  QS='' node $V/shoot_qc.mjs $R/ab/def\$i T1 1 q00,q03 > $R/logs/w1_def\$i.log 2>&1
  QS='p4water=0' node $V/shoot_qc.mjs $R/ab/off\$i T1 1 q00,q03 > $R/logs/w1_off\$i.log 2>&1
 done; echo \"w1 done \$(date +%T)\" >> $L" >> $L 2>&1
node $SP/slot/slot.mjs run 'rejudge_p4water:ptr' -- zsh -c "
 LAB=http://localhost:5177 QS='' node $V/shoot_pointer.mjs $R/ab/ptr_def T1 1 > $R/logs/ptr_def.log 2>&1; echo \"ptr done \$? \$(date +%T)\" >> $L" >> $L 2>&1
echo "$(date +%T) load before perf: $(uptime)" >> $L
SLOT_BG=0 node $SP/slot/slot.mjs run 'rejudge_p4water:perf' -- node $J/tools/rc2h.mjs --vw 1440 --vh 766 --cycles 6 --restcycles 6 --holdcycles 6 --blockms 2500 --confs "lane=5177|tier=T1&scale=1,main=5199|tier=T1&scale=1" --out $R/perf/ab.json > $R/logs/perf.log 2>&1
echo "$(date +%T) perf rc $? load $(uptime)" >> $L
echo CHAIN_DONE >> $L
