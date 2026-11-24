#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
C=$SP/work_p4/wl3c; S=$SP/slot/slot.mjs; T=$C/tools; cd $C
log() { echo "$(date +%T) $*" >> $C/run.log; }
node $S run "wl3c:rest-fin" -- node $T/cap.mjs --port 5169 --path rest --frames 3 --pre 5 --vw 1440 --vh 766 --dsf 1 --tier T1 --out caps/rest_T1_fin > caps/rest_T1_fin.log 2>&1
node $S run "wl3c:capdt-fin" -- node $T/capdt.mjs --port 5169 --out st/c30_fin --path circle --dt 0.0333333 --vw 1512 --vh 860 --dsf 2 --tier T1 --rows 440,620,860 --frames 150 --pre 30 > st/c30_fin.log 2>&1
log "fin caps done"
rlr() { local b=$1 dpr=$2 tier=$3 port=$4 tag=$5 nf=$6; local q="tier=$tier&scale=1"
  node $S run "wl3c:rl-$b-$tag" -- zsh -c "cd $C; node $T/rl.mjs --frames $nf --rx 0 --ry 440 --rw 480 --rh 180 --url http://localhost:$port/ --qs '$q' --dpr $dpr --out rl/${b}_$tag > rl/${b}_$tag.txt 2>&1 & pid=\$!; for k in {1..150}; do sleep 1; grep -q 'frames' rl/${b}_$tag.txt && break; done; sleep 1; kill \$pid 2>/dev/null; true"
  log "rl ${b}_$tag $(tail -1 rl/${b}_$tag.txt | cut -c1-150)"; }
for k in 1 2 3 4; do rlr d2 2 T1 5162 M$k 150; rlr d2 2 T1 5169 L$k 150; done
log "RL D2 DONE"
STRICT=1 SLOT_BG=0 MODE= GATE_S=150 node $S run 'wl3c:perf-sweep' -- node $T/perfab.mjs perf/sweep.json 10 'http://localhost:5162/?tier=T1' 'http://localhost:5169/?tier=T1' 6 13 > perf/sweep.txt 2>&1
log "perf sweep done $(grep -c VALID perf/sweep.txt)"
STRICT=1 SLOT_BG=0 MODE=rest GATE_S=150 node $S run 'wl3c:perf-rest' -- node $T/perfab.mjs perf/rest.json 8 'http://localhost:5162/?tier=T1' 'http://localhost:5169/?tier=T1' 6 10 > perf/rest.txt 2>&1
log "perf rest done $(grep -c VALID perf/rest.txt)"
log "CHAIN A DONE"
