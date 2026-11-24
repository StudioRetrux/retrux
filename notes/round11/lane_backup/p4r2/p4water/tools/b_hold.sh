#!/bin/zsh
# the hold path (press at 0.5 s, 5 s hold, release, 3 s): AA8 (= ?p4water=0, with the waterline mask) and the lane default
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work_p4/p4water
node $SP/slot/slot.mjs run "p4water:hold" -- zsh -c "node $W/tools/pop/cap.mjs --port 5177 --path hold --rows 380,766 --frames 480 --qs 'p4water=0' --mask --out $W/caps/pop/hold_M0 > $W/logs/cap_hold_M0.log 2>&1; echo \"cap hold_M0 rc \$? \$(date +%T)\" >> $W/logs/pop_batches.log; node $W/tools/pop/cap.mjs --port 5177 --path hold --rows 380,766 --frames 480 --out $W/caps/pop/hold_L > $W/logs/cap_hold_L.log 2>&1; echo \"cap hold_L rc \$? \$(date +%T)\" >> $W/logs/pop_batches.log" >> $W/logs/pop_slot.log 2>&1
echo "hold done $(date +%T)" >> $W/logs/pop_batches.log
