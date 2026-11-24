#!/bin/zsh
# AA8 polish (M-1 knee study): one knee K set live (the shared uAAKnee object, writers + readers) through cap.mjs --eval BEFORE
# the settle, on the AA7 final lab (:5197 = MAIN; no rebuild): the six G1 paths (rows 380-766, pre 30; slow 160, medium 240,
# others 120 = the motion judge's caps) + rest 40.   b_k.sh <label> <K|none> <port> [paths...]
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/polish; T=$W/tools
lab=$1; K=$2; port=$3; shift 3; if (( $# )); then paths=($@); else paths=(slow medium fast diag reverse leave rest); fi; t0=$(date +%s)
EV=""; [[ $K != none ]] && EV="window.__hero.pipeline.aa.read.uAAKnee.value = $K"
for p in $paths; do
  n=120; [[ $p == slow ]] && n=160; [[ $p == medium ]] && n=240; [[ $p == rest ]] && n=40
  if [[ -n $EV ]]; then node $T/fx/cap.mjs --port $port --path $p --rows 380,766 --frames $n --eval "$EV" --out $W/caps/${p}_$lab
  else node $T/fx/cap.mjs --port $port --path $p --rows 380,766 --frames $n --out $W/caps/${p}_$lab; fi
  echo "$(date +%T) $lab $p $(( $(date +%s) - t0 ))s"
done
