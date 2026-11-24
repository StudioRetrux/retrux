#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work_p4/p4water
L=$W/logs/final_chain2.log
( zsh $W/tools/b_pop.sh popZ "slow_Z:slow:" "medium_Z:medium:" "fast_Z:fast:" "diag_Z:diag:" "reverse_Z:reverse:" "leave_Z:leave:"
  echo "six caps done $(date +%T)" >> $L
  rm -rf $W/qc_final
  zsh /Users/muhamadrifaldi/RetruxR11Work/hp/qc_r11.zsh $W/qc_final http://localhost:5177 T1 1 > $W/logs/qc.log 2>&1
  echo "qc done rc $? $(date +%T)" >> $L ) &
( node $SP/slot/slot.mjs run 'p4water:id1z' -- zsh $W/tools/b_id1.sh >> $W/logs/id_batch4.log 2>&1
  node $SP/slot/slot.mjs run 'p4water:id2z' -- zsh $W/tools/b_id2.sh >> $W/logs/id_batch4.log 2>&1
  echo "ident done $(date +%T)" >> $L
  node $SP/slot/slot.mjs run 'p4water:g6shots' -- node $W/tools/shot.mjs --out $W/caps/g6fin --confs "def=5177|;g6on=5177|lkwalkj=1;main=5177|p4water=0" --poses ptrR,ptrL,q00,p06 > $W/logs/g6shots.log 2>&1
  echo "g6 shots done $(date +%T)" >> $L ) &
wait
echo CHAIN2_DONE >> $L
