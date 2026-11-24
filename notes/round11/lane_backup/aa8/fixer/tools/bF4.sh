#!/bin/zsh
# AA8 fixer batch F4 (FINAL build, :5199 rebuilt 00:28:17): AJ-2 ctxstep default / lktaa=0 / envlake=plate / T0 phone, loss 1 / 0
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/fixer; T=$W/tools; t0=$(date +%s)
cd $W
for q in "" "lktaa=0" "envlake=plate"; do n=${q:-def}; n=${n//=/}
  for L in 1 0; do node $T/pf/ctxstep.mjs --port 5199 --qs "$q" --loss $L --out ctx/fin_${n}_L$L > ctx/fin_${n}_L$L.json 2> logs/ctx_fin_${n}_L$L.err; done
  echo "$(date +%T) ctx $n $(( $(date +%s) - t0 ))s"
done
for L in 1 0; do node $T/pf/ctxstep.mjs --port 5199 --mobile --qs "" --loss $L --out ctx/fin_t0_L$L > ctx/fin_t0_L$L.json 2> logs/ctx_fin_t0_L$L.err; done
echo "$(date +%T) ctx t0 $(( $(date +%s) - t0 ))s"
