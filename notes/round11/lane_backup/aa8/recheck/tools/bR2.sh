#!/bin/zsh
# AA8 recheck batch R2 (FINAL build :5199): AJ-2 repro = the judge's / fixer's ctxstep (20 stepped moving frames, lose + restore,
# 4 more frames vs the same run without the loss): default / lktaa=0 / envlake=plate / T0 phone; then the live loop (ctxloss2)
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/recheck; T=$W/tools/f; t0=$(date +%s)
cd $W
for q in "" "lktaa=0" "envlake=plate"; do n=${q:-def}; n=${n//=/}
  for L in 1 0; do node $T/pf/ctxstep.mjs --port 5199 --qs "$q" --loss $L --out ctx/rc_${n}_L$L > ctx/rc_${n}_L$L.json 2> logs/ctx_rc_${n}_L$L.err; done
  echo "$(date +%T) ctx $n $(( $(date +%s) - t0 ))s"
done
for L in 1 0; do node $T/pf/ctxstep.mjs --port 5199 --mobile --qs "" --loss $L --out ctx/rc_t0_L$L > ctx/rc_t0_L$L.json 2> logs/ctx_rc_t0_L$L.err; done
echo "$(date +%T) ctx t0 $(( $(date +%s) - t0 ))s"
node $T/pf/ctxloss2.mjs --port 5199 --outdir $W/ctx/live > $W/ana/ctxloss_live.txt 2> $W/logs/ctxloss_live.err
echo "$(date +%T) live $(( $(date +%s) - t0 ))s"
