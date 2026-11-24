#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
W=$SP/work_p4/wl3a; S=$SP/slot/slot.mjs; T=$W/tools; cd $W
C() { local tag=$1; shift; node $S run "wl3a:st-$tag" -- node $T/cap.mjs --tier T1 --path fast --frames 120 "$@" --out st/$tag > st/$tag.log 2>&1; echo "$(date +%T) st $tag $(tail -1 st/$tag.log | cut -c1-90)" >> $W/gates.log; }
C d2_A --port 5169 --rows 380,766 --dsf 2; C d1_A --port 5169 --rows 380,766; C d2_W --port 5167 --rows 380,766 --dsf 2; C d1_W --port 5167 --rows 380,766
echo "$(date +%T) CHAIN C DONE" >> $W/gates.log
