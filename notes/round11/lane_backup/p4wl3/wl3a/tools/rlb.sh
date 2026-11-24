#!/bin/zsh
# wl3a: real-loop runs through the slot. usage: rlb.sh <batch> <dpr> <tier> port:tag:qs ...
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
J=$SP/work_p4/wl3a; S=$SP/slot/slot.mjs; T=$J/tools; cd $J
b=$1; dpr=$2; tier=$3; shift 3
for r in "$@"; do port=${r%%:*}; rest=${r#*:}; tag=${rest%%:*}; qs=${rest#*:}; [[ "$qs" == "$tag" ]] && qs=""
  q="tier=$tier&scale=1"; [[ -n "$qs" ]] && q="$q&$qs"
  node $S run "wl3a:rl-$b-$tag" -- zsh -c "cd $J; node $T/rl.mjs --frames 150 --rx 0 --ry 440 --rw 480 --rh 180 --url http://localhost:$port/ --qs '$q' --dpr $dpr --out rl/${b}_$tag > rl/${b}_$tag.txt 2>&1 & pid=\$!; for k in {1..150}; do sleep 1; grep -q 'frames' rl/${b}_$tag.txt && break; done; sleep 1; kill \$pid 2>/dev/null; true"
  echo "$(date +%T) $b $tag $(tail -1 rl/${b}_$tag.txt | cut -c1-200)" >> $J/run.log
done
echo "$(date +%T) BATCH $b DONE" >> $J/run.log
