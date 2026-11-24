#!/bin/zsh
# AA8 polish id1: the aa8 lane (:5199, P-1 + P-4 + comments) with the recheck's exact identS args; compared with the recheck's
# saved :5197 final hashes ($SP/work7/recheck/ident/r5197_*.json, deterministic per the recheck)
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/polish; T=$W/tools; I=$W/ident; t0=$(date +%s)
P=${PORT8:-5199}; L=${LAB8:-p8}
run() { node $T/fx/identS.mjs "$@" > /dev/null 2>> $W/logs/ident.err; echo "$(date +%T) done $*"; }
A5="aaresolve=0&slabflash=0&lktaa=0&lkglide=0&ffblock=0"; A6="$A5&mirrorcost=0"
run --port $P --out $I/${L}_def.json
run --port $P --qs "ffblock=0" --out $I/${L}_f0.json
run --port $P --qs "lkglide=0" --out $I/${L}_g0.json
run --port $P --qs "$A5" --out $I/${L}_all5.json
run --port $P --qs "mirrorcost=0" --out $I/${L}_mc0.json
run --port $P --qs "mrows=0" --out $I/${L}_mr0.json
run --port $P --mobile --out $I/${L}_t0.json
run --port $P --scale 0.7 --out $I/${L}_s07.json
run --port $P --scale 0.7 --qs "ffblock=0" --out $I/${L}_s07f0.json
run --port $P --scale 0.7 --qs "mrows=0" --out $I/${L}_s07mr0.json
run --port $P --scale 0.9 --qs "ffblock=0" --out $I/${L}_s09f0.json
run --port $P --qs "lkglide=0&mirrorcost=0" --out $I/${L}_g0mc0.json
run --port $P --qs "$A6" --out $I/${L}_all6.json
run --port $P --tier T2 --qs "$A6" --out $I/${L}_t2all6.json
run --port $P --qs "envlake=plate" --out $I/${L}_plate.json
echo "id1 $(( $(date +%s) - t0 ))s"
