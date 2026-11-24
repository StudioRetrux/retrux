#!/bin/zsh
# final 1: product default (F1) smoke + slow / medium 240 + fast / diag 120
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/tools
t0=$(date +%s)
node cap.mjs --port 5193 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/caps/smokeF --path medium --frames 3 --rows 380,766 || exit 1
if grep -qiE "error|warning" /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/caps/smokeF/log.txt; then echo "SMOKE FAILED"; head -20 /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/caps/smokeF/log.txt; exit 1; fi
cap() { node cap.mjs --port 5193 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/caps/$1_$2 --path $1 --frames $3 --rows 380,766 --qs "$4"; echo "$1_$2 t $(( $(date +%s) - t0 ))s"; }
cap slow F1 240 ""
cap medium F1 240 ""
cap fast F1 120 ""
cap diag F1 120 ""
