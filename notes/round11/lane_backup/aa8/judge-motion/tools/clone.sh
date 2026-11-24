#!/bin/zsh
# clone judge-artrefl's finished cap.mjs captures (APFS clone = no extra disk) as soon as each meta.json exists
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/motion; AR=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/artrefl/caps
for p in slow medium reverse fast diag leave; do
  until [[ -f $AR/${p}_A7/meta.json ]]; do sleep 5; done
  sleep 2; cp -c -R $AR/${p}_A7 $W/caps/${p}_A7 && echo "$(date +%T) cloned ${p}_A7 ($(ls $W/caps/${p}_A7 | wc -l) files)" >> $W/logs/clone.out
done
for p in reverse fast; do
  until [[ -f $AR/${p}_A6/meta.json ]]; do sleep 5; done
  sleep 2; cp -c -R $AR/${p}_A6 $W/caps/${p}_A6 && echo "$(date +%T) cloned ${p}_A6" >> $W/logs/clone.out
done
