#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/polish; T=$W/tools
node $SP/slot/slot.mjs run "aa8-polish ctx" -- zsh $T/b_ctx.sh >> $W/logs/b_ctx.log 2>&1
node $SP/slot/slot.mjs run "aa8-polish id1" -- zsh $T/b_id1.sh >> $W/logs/b_id1.log 2>&1
node $SP/slot/slot.mjs run "aa8-polish id2" -- zsh $T/b_id2.sh >> $W/logs/b_id2.log 2>&1
