#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
J=$SP/work_p4/judge_wl3a; S=$SP/slot/slot.mjs; T=$J/tools; cd $J
log() { echo "$(date +%T) $*" >> $J/run.log; }
rlr() { local b=$1 dpr=$2 tier=$3 port=$4 tag=$5 nf=$6; local q="tier=$tier&scale=1"
  node $S run "judge_wl3a:rl-$b-$tag" -- zsh -c "cd $J; node $T/rl.mjs --frames $nf --rx 0 --ry 440 --rw 480 --rh 180 --url http://localhost:$port/ --qs '$q' --dpr $dpr --out rl/${b}_$tag > rl/${b}_$tag.txt 2>&1 & pid=\$!; for k in {1..150}; do sleep 1; grep -q 'frames' rl/${b}_$tag.txt && break; done; sleep 1; kill \$pid 2>/dev/null; true"
  log "rl ${b}_$tag $(tail -1 rl/${b}_$tag.txt | cut -c1-160)"; }
until grep -q "rl t2_L2" $J/run.log; do sleep 2; done
rlr a1b 1 T1 5169 L1 300; rlr a1b 1 T1 5162 M1 300; rlr a1b 1 T1 5169 L2 300; rlr a1b 1 T1 5162 M2 300
for r in 5162:M 5169:L; do port=${r%%:*}; tag=${r#*:}
  node $S run "judge_wl3a:capdt1-$tag" -- node $T/capdt.mjs --port $port --out st/d1_$tag --path circle --dt 0.025 --vw 1512 --vh 860 --dsf 1 --tier T1 --rows 440,620,860 --frames 150 --pre 30 > st/d1_$tag.log 2>&1
  log "capdt d1 $tag $(tail -1 st/d1_$tag.log | cut -c1-80)"; done
log "MORE DONE"
