#!/bin/zsh
# recheck G1 caps on the final :5197 (the motion judge's exact args): b_cap.sh path frames [path frames ...]
t0=$(date +%s)
while (( $# >= 2 )); do p=$1; n=$2; shift 2
  node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/recheck/tools/mo/cap.mjs --port 5197 --path $p --rows 380,766 --frames $n --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/recheck/caps/${p}_FIN > /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/recheck/logs/cap_$p.log 2>&1; echo "$(date +%T) cap $p $(( $(date +%s) - t0 ))s"
done
