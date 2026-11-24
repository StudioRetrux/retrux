#!/bin/zsh
# AA8 fixer batch F1 (PRE-fix, :5199 = the integrator's build pid 64433): AJ-2 ctxstep default + lktaa=0, loss 1 / 0;
# AJ-1 medium sweep capture (rows 380-766, 240 frames) + the lab's 2x-rows mirror (lkmscale=0.5,1) on the same sweep (option 3 data)
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/fixer; T=$W/tools; t0=$(date +%s)
cd $W
for q in "" "lktaa=0"; do n=${q:-def}; n=${n//=/}
  for L in 1 0; do node $T/pf/ctxstep.mjs --port 5199 --qs "$q" --loss $L --out ctx/pre_${n}_L$L > ctx/pre_${n}_L$L.json 2> logs/ctx_pre_${n}_L$L.err; done
  echo "$(date +%T) ctx $n $(( $(date +%s) - t0 ))s"
done
node $T/cap.mjs --port 5199 --path medium --rows 380,766 --frames 240 --out $W/caps/medium_A8 > logs/cap_medium_A8.log 2>&1; echo "$(date +%T) medium_A8 $(( $(date +%s) - t0 ))s"
node $T/cap.mjs --port 5199 --path medium --rows 380,766 --frames 240 --qs "lkmscale=0.5,1" --out $W/caps/medium_A8r2 > logs/cap_medium_A8r2.log 2>&1; echo "$(date +%T) medium_A8r2 $(( $(date +%s) - t0 ))s"
