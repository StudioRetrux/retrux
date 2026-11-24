#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4water; L=$W/logs/fix_chain.log; I=$W/ident/fix
run() { node $W/tools/identS.mjs "$@" > /dev/null 2>> $W/logs/fix_ident.err; echo "$(date +%T) done $*" >> $W/logs/fix_ident.log; }
echo "start $(date +%T)" >> $L
node $SP/slot/slot.mjs run 'p4water:fixid1' -- zsh -c "
  $(typeset -f run); W=$W
  run --port 5177 --qs 'p4water=0' --out $I/x_off_t1.json
  run --port 5199 --out $I/xm_t1.json
  run --port 5177 --tier T2 --qs 'p4water=0' --out $I/x_off_t2.json
  run --port 5177 --mobile --out $I/x_t0.json" >> $L 2>&1
node $SP/slot/slot.mjs run 'p4water:fixid2' -- zsh -c "
  $(typeset -f run); W=$W
  run --port 5177 --qs 'envlake=plate' --out $I/x_plate.json
  run --port 5177 --qs 'envlake=plate&p4water=0' --out $I/x_off_plate.json
  run --port 5177 --out $I/x_def_t1.json" >> $L 2>&1
echo "ident done $(date +%T)" >> $L
node $SP/slot/slot.mjs run 'p4water:fixhold2' -- node $W/tools/pop/cap.mjs --port 5177 --path hold --rows 380,766 --frames 480 --out $W/caps/pop/hold_F2 > $W/logs/cap_hold_F2.log 2>&1
echo "hold_F2 rc $? $(date +%T)" >> $L
rm -rf $W/qc_fix
zsh /Users/muhamadrifaldi/RetruxR11Work/hp/qc_r11.zsh $W/qc_fix http://localhost:5177 T1 1 > $W/logs/qc_fix.log 2>&1
echo "qc done rc $? $(date +%T)" >> $L
SLOT_BG=0 node $SP/slot/slot.mjs run "p4water:fixperf" -- node $W/tools/rc2h.mjs --vw 1440 --vh 766 --cycles 6 --restcycles 6 --holdcycles 6 --blockms 2500 --confs "lane=5177|tier=T1&scale=1,main=5199|tier=T1&scale=1" --out $W/perf/ab_fix1.json > $W/logs/perf_fix1.log 2>&1
echo "perf rc $? $(date +%T)" >> $L
echo CHAIN_DONE >> $L
