#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
C=$SP/work_p4/wl3c; S=$SP/slot/slot.mjs; T=$C/tools; cd $C
log() { echo "$(date +%T) $*" >> $C/run.log; }
rlr() { local b=$1 dpr=$2 tier=$3 port=$4 tag=$5 nf=$6; local q="tier=$tier&scale=1"
  node $S run "wl3c:rl-$b-$tag" -- zsh -c "cd $C; node $T/rl.mjs --frames $nf --rx 0 --ry 440 --rw 480 --rh 180 --url http://localhost:$port/ --qs '$q' --dpr $dpr --out rl/${b}_$tag > rl/${b}_$tag.txt 2>&1 & pid=\$!; for k in {1..150}; do sleep 1; grep -q 'frames' rl/${b}_$tag.txt && break; done; sleep 1; kill \$pid 2>/dev/null; true"
  log "rl ${b}_$tag $(tail -1 rl/${b}_$tag.txt | cut -c1-110)"; }
for k in 1 2 3; do rlr d1 1 T1 5162 M$k 200; rlr d1 1 T1 5169 L$k 200; done
log "RL D1 DONE"
for r in 5162:T2M 5167:T2W 5169:T2L; do node $S run "wl3c:capdt-${r#*:}" -- node $T/capdt.mjs --port ${r%%:*} --out st/c30_${r#*:} --path circle --dt 0.0333333 --vw 1512 --vh 860 --dsf 2 --tier T2 --rows 440,620,860 --frames 150 --pre 30 > st/c30_${r#*:}.log 2>&1; done
log "CHAIN X DONE"
