#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
C=$SP/work_p4/wl3c; S=$SP/slot/slot.mjs; T=$C/tools; cd $C
log() { echo "$(date +%T) $*" >> $C/run.log; }
R() { node $S run "wl3c:rest-$1" -- node $T/cap.mjs --port 5169 --qs "$2" --path rest --frames 3 --pre 5 --vw 1440 --vh 766 --dsf 1 --tier T1 --out caps/rest_T1_$1 > caps/rest_T1_$1.log 2>&1; }
D() { node $S run "wl3c:capdt-$1" -- node $T/capdt.mjs --port 5169 --out st/c30_$1 --path circle --dt 0.0333333 --vw 1512 --vh 860 --dsf 2 --tier T1 --rows 440,620,860 --frames 150 --pre 30 --qs "$2" > st/c30_$1.log 2>&1; }
V() { R $1 "$2"; D $1 "$2"; log "var $1 done"; }
{ V g2e4 "wl3cg=0.0002"; V n5 "wl3cg=0&wl3cn=5"; } &
{ V g5e4 "wl3cg=0.0005"; V n6 "wl3cg=0&wl3cn=6"; } &
{ V g1e3 "wl3cg=0.001"; V n8 "wl3cg=0&wl3cn=8"; } &
wait; log R3 DONE
