#!/bin/zsh
# pop-gate captures on the lane (:5177): $1 = batch label, then "name:path:qs" items (qs may be empty)
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
W=$SP/work_p4/p4water
lab=$1; shift
cmds=""
for it in "$@"; do
  n=${it%%:*}; r=${it#*:}; p=${r%%:*}; q=${r#*:}
  extra=""; [[ -n "$q" ]] && extra="--qs '$q'"
  fr=240; [[ $p == hold ]] && fr=480
  cmds="$cmds node $W/tools/pop/cap.mjs --port 5177 --path $p --rows 380,766 --frames $fr $extra --out $W/caps/pop/$n > $W/logs/cap_$n.log 2>&1; echo \"cap $n rc \$? \$(date +%T)\" >> $W/logs/pop_batches.log;"
done
node $SP/slot/slot.mjs run "p4water:$lab" -- zsh -c "$cmds" >> $W/logs/pop_slot.log 2>&1
echo "$lab done $(date +%T)" >> $W/logs/pop_batches.log
