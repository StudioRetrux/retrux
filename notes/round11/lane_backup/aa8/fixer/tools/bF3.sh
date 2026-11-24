#!/bin/zsh
# AA8 fixer batch F3 (POST-fix build): identS part 2 (integrator's i_B / i_C sets on :5199 only)
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/fixer; T=$W/tools; I=$W/ident; t0=$(date +%s)
run() { node $T/fx/identS.mjs "$@" > /dev/null 2>> $W/logs/ident.err; echo "$(date +%T) done $*"; }
A5="aaresolve=0&slabflash=0&lktaa=0&lkglide=0&ffblock=0"; FL="ffbd0=0&ffbd1=0.01&ffbl=1"; A6="aaresolve=0&slabflash=0&lktaa=0&lkglide=0&ffblock=0&mirrorcost=0&fftip=0"
run --port 5199 --qs "lkglide=0&mirrorcost=0" --out $I/f8_g0mc0.json
for v in "g0|lkglide=0" "all5|$A5" "lktaa0|lktaa=0" "ar0|aaresolve=0"; do n=${v%%|*}; q=${v#*|}; run --port 5199 --qs "$q" --out $I/f8_$n.json; done
run --port 5199 --qs "$FL" --out $I/f8_ffblab.json
run --port 5199 --nodebug --qs "$FL" --out $I/f8_nodbg_ffblab.json
run --port 5199 --qs "$A6" --out $I/f8_all6t.json
run --port 5199 --tier T2 --qs "$A6" --out $I/f8_t2all6t.json
run --port 5199 --qs "envlake=plate" --out $I/f8_plate.json
run --port 5199 --mobile --out $I/f8_t0.json
echo "F3 $(( $(date +%s) - t0 ))s"
