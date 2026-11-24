#!/bin/zsh
# wl3a: deterministic dt-1/30 circle captures through the slot. usage: cdb.sh port:tag:qs ...
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
J=$SP/work_p4/wl3a; T=$J/tools; cd $J
for r in "$@"; do port=${r%%:*}; rest=${r#*:}; tag=${rest%%:*}; qs=${rest#*:}; [[ "$qs" == "$tag" ]] && qs=""
  node $SP/slot/slot.mjs run "wl3a:capdt-$tag" -- node $T/capdt.mjs --port $port --out st/c30_$tag --path circle --dt ${DT:-0.0333333} --vw ${VW:-1512} --vh ${VH:-860} --dsf ${DSF:-2} --tier ${TIER:-T1} --rows ${ROWS:-440,620,860} --frames ${NF:-150} --pre 30 --qs "$qs" > st/c30_$tag.log 2>&1
done
