#!/bin/zsh
# run several b_k batches one after another, each in its own slot turn
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/polish; T=$W/tools
for spec in "$@"; do
  set -- ${=spec}
  node $SP/slot/slot.mjs run "aa8-polish knee $1" -- zsh $T/b_k.sh $@ >> $W/logs/chainK_$1.log 2>&1
done
