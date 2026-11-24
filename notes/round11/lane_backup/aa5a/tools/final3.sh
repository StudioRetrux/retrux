#!/bin/zsh
# final 3: settle-to-rest (leave 240) and rest identity, F1 vs ?lkglide=0; then G10 (DPR 1 / 2, resize, live engine)
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/tools
t0=$(date +%s)
cap() { node cap.mjs --port 5193 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/caps/$1_$2 --path $1 --frames $3 --rows 380,766 --qs "$4"; echo "$1_$2 t $(( $(date +%s) - t0 ))s"; }
cap leave F1L 240 ""
cap leave offL 240 "lkglide=0"
cap rest F1 40 ""
cap rest off 40 "lkglide=0"
node g10.mjs --port 5193 > /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/ana/g10.json 2>&1; echo "g10 t $(( $(date +%s) - t0 ))s"
