#!/bin/zsh
# AA8 integrator batch C: G8 / G9 vs BASE (:5182, fresh, BASE's plain URL): all six AA switches off + ?fftip=0 (T1, T2), plate, T0;
# then the P-1 stepped context-loss repro on :5199 (def + lktaa=0, loss 0 / 1) and a slow G1 capture of the integrated default
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/integ; T=$W/tools; I=$W/ident; t0=$(date +%s)
run() { node $T/fx/identS.mjs "$@" > /dev/null 2>> $W/logs/ident.err; echo "$(date +%T) done $*"; }
A6="aaresolve=0&slabflash=0&lktaa=0&lkglide=0&ffblock=0&mirrorcost=0&fftip=0"
run --port 5199 --qs "$A6" --out $I/i8_all6t.json
run --port 5182 --out $I/b_t1.json
run --port 5199 --tier T2 --qs "$A6" --out $I/i8_t2all6t.json
run --port 5182 --tier T2 --out $I/b_t2.json
run --port 5199 --qs "envlake=plate" --out $I/i8_plate.json
run --port 5182 --qs "envlake=plate" --out $I/b_plate.json
run --port 5199 --mobile --out $I/i8_t0.json
run --port 5182 --mobile --out $I/b_t0.json
cd $W
for q in "" "lktaa=0"; do n=${q:-def}; n=${n//=/}
  for L in 0 1; do node $T/pf/ctxstep.mjs --port 5199 --qs "$q" --loss $L --out ctx/i8_${n}_L$L > ctx/i8_${n}_L$L.json; done
  echo "$(date +%T) ctx $n"
done
node $T/fx/cap.mjs --port 5199 --path slow --rows 380,766 --frames 160 --out $W/caps/slow_I8; echo "$(date +%T) cap slow_I8"
echo "i_C $(( $(date +%s) - t0 ))s"
