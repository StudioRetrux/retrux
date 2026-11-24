#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
C=$SP/work_p4/wl3c; S=$SP/slot/slot.mjs; T=$C/tools; cd $C
log() { echo "$(date +%T) $*" >> $C/run.log; }
R() { node $S run "wl3c:rest-$1" -- node $T/cap.mjs --port 5169 --qs "$2" --path rest --frames 3 --pre 5 --vw 1440 --vh 766 --dsf 1 --tier T1 --out caps/rest_T1_$1 > caps/rest_T1_$1.log 2>&1; log "rest $1 done"; }
D() { node $S run "wl3c:capdt-$1" -- node $T/capdt.mjs --port ${3:-5169} --out st/c30_$1 --path circle --dt 0.0333333 --vw 1512 --vh 860 --dsf 2 --tier T1 --rows 440,620,860 --frames 150 --pre 30 --qs "$2" > st/c30_$1.log 2>&1; log "capdt $1 done"; }
{ R d25 ""; R d15 "wl3awd=15"; R d40 "wl3awd=40"; } &
{ D d25 ""; } &
{ sleep 2; R w0 "wl3aw=0"; D w0 "wl3aw=0"; } &
wait; log R1 DONE
