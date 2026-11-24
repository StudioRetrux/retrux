#!/bin/zsh
# six G1 paths on the tip lab (the motion judge's exact cap args) -> caps/<p>_TIP
t0=$(date +%s)
while (( $# >= 2 )); do p=$1; n=$2; shift 2
  node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/tip/tools/mocap.mjs --port 5198 --path $p --rows 380,766 --frames $n --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/tip/caps/${p}_TIP > /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/tip/logs/cap_$p.log 2>&1; echo "$(date +%T) cap $p $(( $(date +%s) - t0 ))s"
done
