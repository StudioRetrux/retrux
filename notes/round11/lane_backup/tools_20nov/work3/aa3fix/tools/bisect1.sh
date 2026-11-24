#!/bin/zsh
# pale-block bisect: reverse path k0-55, lane lab, lake lab switches
F=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3fix
CAP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3/tools/cap.mjs
for spec in "r_lane:" "r_half0:lkhalf=0" "r_wdiv2:lkwdiv=2" "r_wnear0:lkwnear=0" "r_wedge0:lkwedge=0" "r_stale0:lkstale=0" "r_strata2:lkstrata=2" "r_cache0:lkcache=0"; do
  name=${spec%%:*}; q=${spec#*:}
  t0=$(date +%s)
  if [[ -n "$q" ]]; then node $CAP --port 5181 --out $F/caps/$name --path reverse --frames 56 --rows 380,766 --qs "$q"; else node $CAP --port 5181 --out $F/caps/$name --path reverse --frames 56 --rows 380,766; fi
  echo "[bisect] $name $(( $(date +%s) - t0 )) s"
done
