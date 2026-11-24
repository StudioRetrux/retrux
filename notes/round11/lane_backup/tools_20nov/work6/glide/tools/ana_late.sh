#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/glide; T=$W/tools; C=$W/caps
cd $T
until [[ -f $C/dpr2/raw.log.txt ]]; do sleep 5; done
nice -n 10 node l5g4.mjs none $C/dpr2/a6 $C/dpr2/raw > $W/ana/l5g4_dpr2.txt; echo "dpr2 done $(date +%T)"
