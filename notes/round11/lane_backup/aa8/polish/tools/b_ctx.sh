#!/bin/zsh
# AA8 polish P-1: the perf judge's stepped context-loss repro (ctxstep.mjs: 20 moving frames, lose + restore, 4 more frames)
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/polish; T=$W/tools; t0=$(date +%s)
mkdir -p $W/g10/ctxstep; cd $W
for pl in "5199 p8" "5197 a7"; do set -- ${=pl}; P=$1; L=$2
for q in "" "lktaa=0"; do n=${q:-def}; n=${n//=/}
  node $T/pf/ctxstep.mjs --port $P --qs "$q" --loss 0 --out g10/ctxstep/${L}_${n}_L0 > g10/ctxstep/${L}_${n}_L0.json
  node $T/pf/ctxstep.mjs --port $P --qs "$q" --loss 1 --out g10/ctxstep/${L}_${n}_L1 > g10/ctxstep/${L}_${n}_L1.json
  echo "$(date +%T) $L $n $(( $(date +%s) - t0 ))s"
done; done
