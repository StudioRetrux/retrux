#!/bin/zsh
# AA6 medium 240 captures (same tool / path / rows as aa5a / aa5b / aa3fix): default (F1 + v3) and lkglide=0&ffblock=0 (= fixed1)
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/integ
t0=$(date +%s)
cap() { node $W/tools/aa3/cap.mjs --port 5196 --out $W/caps/$1_$2 --path $1 --frames $3 --rows 380,766 --qs "$4"; echo "$1_$2 t $(( $(date +%s) - t0 ))s"; }
cap medium A6 240 ""
cap medium A6g0f0 240 "lkglide=0&ffblock=0"
