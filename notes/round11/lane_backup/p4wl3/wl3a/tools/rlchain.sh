#!/bin/zsh
# wl2 fixer: real loop T1 (DPR arg) alternated through the slot. usage: rlchain.sh <dpr> <prefix> port:tag:qs ...
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
W=$SP/work_p4/wl2/fix; S=$SP/slot/slot.mjs; T=$W/tools; cd $W
dpr=$1; pre=$2; shift 2
for r in "$@"; do port=${r%%:*}; rest=${r#*:}; tag=${rest%%:*}; qs=${rest#*:}
  node $S run "wl2fix:rl-$tag" -- zsh -c "cd $W; node $T/rl.mjs --frames 150 --rx 0 --ry 440 --rw 480 --rh 180 --url http://localhost:$port/ --qs 'tier=T1&scale=1$qs' --dpr $dpr --out rl/${pre}_$tag > rl/${pre}_$tag.txt 2>&1 & pid=\$!; for k in {1..150}; do sleep 1; grep -q 'frames' rl/${pre}_$tag.txt && break; done; sleep 1; kill \$pid 2>/dev/null; true"
  echo "$(date +%T) rl ${pre}_$tag $(tail -1 rl/${pre}_$tag.txt | cut -c1-140)" >> $W/run.log; done
echo "$(date +%T) RLCHAIN $pre DONE" >> $W/run.log
