#!/bin/zsh
# AA8 polish id3b: the final build's switches where the knee stays 0.5 or is unused (vs the recheck's AA7 hashes / my AA7 runs),
# a slow G1 capture of the final default (vs the knee study's live K 0.6 caps), and the P-1 repro on the final build
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/polish; T=$W/tools; I=$W/ident; t0=$(date +%s)
run() { node $T/fx/identS.mjs "$@" > /dev/null 2>> $W/logs/ident.err; echo "$(date +%T) done $*"; }
A5="aaresolve=0&slabflash=0&lktaa=0&lkglide=0&ffblock=0"; A6="$A5&mirrorcost=0"
run --port 5199 --qs "lkglide=0" --out $I/fd_g0.json
run --port 5199 --qs "lkglide=0&mirrorcost=0" --out $I/fd_g0mc0.json
run --port 5199 --qs "$A5" --out $I/fd_all5.json
run --port 5199 --qs "$A6" --out $I/fd_all6.json
run --port 5199 --tier T2 --qs "$A6" --out $I/fd_t2all6.json
run --port 5199 --qs "envlake=plate" --out $I/fd_plate.json
run --port 5199 --mobile --out $I/fd_t0.json
run --port 5199 --qs "lktaa=0" --out $I/fd_lktaa0.json
run --port 5199 --qs "aaresolve=0" --out $I/fd_ar0.json
node $T/fx/cap.mjs --port 5199 --path slow --rows 380,766 --frames 160 --out $W/caps/slow_FINAL; echo "$(date +%T) cap slow_FINAL"
cd $W; for L in 0 1; do node $T/pf/ctxstep.mjs --port 5199 --loss $L --out g10/ctxstep/fd_def_L$L > g10/ctxstep/fd_def_L$L.json; done; echo "$(date +%T) ctx final"
echo "id3b $(( $(date +%s) - t0 ))s"
