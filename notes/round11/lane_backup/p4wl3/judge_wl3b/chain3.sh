#!/bin/zsh
# judge_wl3b: 60 fps sparkle at rest (40 frames at 1/60 s, T1 DPR 2), after chain2's real loops
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
J=$SP/work_p4/judge_wl3b; S=$SP/slot/slot.mjs; T=$J/tools; cd $J; mkdir -p s60
log() { echo "$(date +%T) $*" >> $J/run.log; }
until grep -q "CHAIN2 DONE" $J/run.log; do sleep 2; done
for pp in 5162:M 5167:B 5168:L; do node $S run "judge_wl3b:s60" -- node $T/cap.mjs --port ${pp%%:*} --tier T1 --path rest --frames 40 --pre 30 --dsf 2 --rows 400,640,766 --out s60/${pp#*:} > s60/${pp#*:}.log 2>&1; done
/Applications/Blender.app/Contents/Resources/5.2/python/bin/python3.13 -I $T/lipan.py $T s60 M=M B=B L=L > s60_rest.txt 2>&1
log "s60 done"
