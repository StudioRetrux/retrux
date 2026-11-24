#!/bin/zsh
# judge_p4env3: deterministic A/B shots (same sim time per shot) on MAIN :5173 and the lane :5174
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4env3
for v in "$@"; do
  name=${v%%=*}; rest=${v#*=}; port=${rest%%:*}; qs=${rest#*:}
  [[ "$qs" == "$rest" ]] && qs=""
  node $J/tools/shots.mjs $port $J/ab/$name "$qs" > $J/ab/$name.log 2>&1
  echo "$name ($port $qs) done $(date +%T) errors=$(grep -c ERROR $J/ab/$name/log.txt)"
done
