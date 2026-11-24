#!/bin/zsh
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/motion
R=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/motion-recheck
t0=$(date +%s)
node $J/tools/cap.mjs --port 5181 --out $R/caps/off_medium --path medium --rows 380,766 --qs "aaresolve=0&slabflash=0&lktaa=0"
echo "[batchB] off_medium took $(( $(date +%s) - t0 )) s"; t0=$(date +%s)
node $J/tools/cap.mjs --port 5182 --out $R/caps/basenm_medium --path medium --rows 380,766
echo "[batchB] basenm_medium took $(( $(date +%s) - t0 )) s"; t0=$(date +%s)
node $J/tools/rl.mjs --port 5181 --out $R/rl/fix_medium --path medium --frames 180
node $J/tools/rl.mjs --port 5181 --out $R/rl/fix_slow --path slow --frames 180
echo "[batchB] rl took $(( $(date +%s) - t0 )) s"
echo BATCHB-DONE
