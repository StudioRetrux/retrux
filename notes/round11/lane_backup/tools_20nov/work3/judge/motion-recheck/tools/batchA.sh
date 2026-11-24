#!/bin/zsh
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/motion
R=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/motion-recheck
for p in medium reverse fast leave slow diag; do
  t0=$(date +%s)
  node $J/tools/cap.mjs --port 5181 --out $R/caps/fix_$p --path $p --rows 380,766
  echo "[batchA] fix_$p took $(( $(date +%s) - t0 )) s"
done
echo BATCHA-DONE
