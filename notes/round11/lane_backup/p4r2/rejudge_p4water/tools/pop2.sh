#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
R=$SP/work_p4/rejudge_p4water; W=$SP/work_p4/p4water; T=$W/tools/pop; L=$R/logs/pop2.log
until grep -q CHAIN_DONE $R/logs/chain.log 2>/dev/null; do sleep 5; done
echo "$(date +%T) start pop2" >> $L
node $SP/slot/slot.mjs run 'rejudge_p4water:pop' -- zsh -c "
 node $T/cap.mjs --port 5177 --path diag --rows 380,766 --frames 240 --out $R/caps/diag_X > $R/logs/cap_diag.log 2>&1; echo \"cap diag rc \$? \$(date +%T)\" >> $L
 node $T/cap.mjs --port 5177 --path leave --rows 380,766 --frames 240 --out $R/caps/leave_X > $R/logs/cap_leave.log 2>&1; echo \"cap leave rc \$? \$(date +%T)\" >> $L" >> $L 2>&1
for p in diag leave; do
  case $p in diag) M=$SP/work5/aa5a/caps/diag_mask; GT=$SP/work6/refl/caps/diag_gt;; leave) M=$SP/work6/refl/caps/leave_bmask; GT=$SP/work6/refl/caps/leave_gt;; esac
  A8=$SP/work8/motion/caps/${p}_A8; X=$R/caps/${p}_X
  { echo "### $p"; node $T/popscan.mjs --mask $M --gt $GT --thr 40 A8=$A8 LANE=$X --top 3 2>&1
    echo "-- popnew LANE vs A8"; node $T/popnew.mjs --mask $M --gt $GT --x $X --ref $A8 --top 8 2>&1
    echo "-- popnew A8 vs LANE"; node $T/popnew.mjs --mask $M --gt $GT --x $A8 --ref $X --top 3 2>&1; } > $R/ana/pop_$p.txt
done
echo "$(date +%T) POP2_DONE" >> $L
