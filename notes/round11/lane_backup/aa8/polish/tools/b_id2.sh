#!/bin/zsh
# AA8 polish id2: switches the recheck did not run, on both aa8 (:5199) and AA7 (:5197): lktaa=0, aaresolve=0, slabflash=0, the
# product URL without ?debug (P-4), and the AA5b lab params with ?debug (P-4: still live in the lab)
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/polish; T=$W/tools; I=$W/ident; t0=$(date +%s)
run() { node $T/fx/identS.mjs "$@" > /dev/null 2>> $W/logs/ident.err; echo "$(date +%T) done $*"; }
for pl in "5199 p8" "5197 a7"; do set -- ${=pl}; P=$1; L=$2
run --port $P --qs "lktaa=0" --out $I/${L}_lktaa0.json
run --port $P --qs "aaresolve=0" --out $I/${L}_ar0.json
run --port $P --qs "slabflash=0" --out $I/${L}_sf0.json
run --port $P --nodebug --out $I/${L}_nodbg.json
run --port $P --qs "ffbd0=0&ffbd1=0.01&ffbl=1" --out $I/${L}_ffblab.json
done
echo "id2 $(( $(date +%s) - t0 ))s"
