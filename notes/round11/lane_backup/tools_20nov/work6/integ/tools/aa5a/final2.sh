#!/bin/zsh
# final 2: reverse / leave 120, hold 360 (F1); AA3 (lkglide=0) hold 360; no-AA refs medium / fast 120 (TAA off; raw resolve)
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/tools
t0=$(date +%s)
cap() { node cap.mjs --port 5193 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/caps/$1_$2 --path $1 --frames $3 --rows 380,766 --qs "$4"; echo "$1_$2 t $(( $(date +%s) - t0 ))s"; }
cap reverse F1 120 ""
cap leave F1 120 ""
cap hold F1 360 ""
cap fast taa0 120 "lktaa=0"
cap medium taa0 120 "lktaa=0"
cap fast raw 120 "envedge=0"
