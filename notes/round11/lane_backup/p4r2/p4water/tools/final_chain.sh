#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work_p4/p4water
L=$W/logs/final_chain.log
until grep -q "popF done" $W/logs/pop_batches.log && grep -q "ID DONE" $W/logs/id_batch3.log; do sleep 2; done
echo "captures + ident done $(date +%T)" >> $L
zsh $W/tools/b_perf2.sh 4
echo "perf4 done $(date +%T)" >> $L
rm -rf $W/qc_final
zsh /Users/muhamadrifaldi/RetruxR11Work/hp/qc_r11.zsh $W/qc_final http://localhost:5177 T1 1 > $W/logs/qc.log 2>&1 &
sleep 20
node $SP/slot/slot.mjs run 'p4water:g6shots' -- node $W/tools/shot.mjs --out $W/caps/g6fin --confs "def=5177|;g6on=5177|lkwalkj=1;main=5177|p4water=0" --poses ptrR,ptrL,q00 > $W/logs/g6shots.log 2>&1
echo "g6 shots done $(date +%T)" >> $L
wait
echo "qc done $(date +%T)" >> $L
echo CHAIN_DONE >> $L
