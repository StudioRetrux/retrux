#!/bin/zsh
# usage: batch.sh <spec> ...   spec = name:port:path[:extra cap args with commas->spaces]
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/motion
for spec in "$@"; do
  name=${spec%%:*}; rest=${spec#*:}; port=${rest%%:*}; rest=${rest#*:}; p=${rest%%:*}; extra=""
  [[ "$rest" == *:* ]] && extra=${rest#*:}
  t0=$(date +%s)
  node $J/tools/cap.mjs --port $port --out $J/caps/$name --path $p --rows 380,766 ${=extra//,/ }
  echo "[batch] $name took $(( $(date +%s) - t0 )) s"
done
