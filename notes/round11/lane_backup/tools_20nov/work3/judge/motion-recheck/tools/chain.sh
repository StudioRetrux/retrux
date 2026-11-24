#!/bin/zsh
R=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/motion-recheck
for p in medium reverse fast leave slow diag; do
  until grep -q "fix_$p took" $R/caps/batchA.log 2>/dev/null; do sleep 3; done
  $R/tools/ana.sh $p
  $R/tools/imgs.sh $p 2>&1 | tail -1
  echo "[chain] $p analysed $(date +%T)"
done
echo CHAIN-DONE
