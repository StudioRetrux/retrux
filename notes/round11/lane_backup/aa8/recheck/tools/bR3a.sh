#!/bin/zsh
# AA8 recheck batch R3a (FINAL build :5199): identS (20 moving frames; final image + 5 targets + every linked program), part 1
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/recheck; T=$W/tools/f; I=$W/ident; t0=$(date +%s)
run() { node $T/fx/identS.mjs "$@" > /dev/null 2>> $W/logs/ident.err; echo "$(date +%T) done $*"; }
A6="aaresolve=0&slabflash=0&lktaa=0&lkglide=0&ffblock=0&mirrorcost=0&fftip=0"
run --port 5199 --out $I/r8_def.json
run --port 5199 --qs "lkglide=0&mirrorcost=0" --out $I/r8_g0mc0.json
run --port 5199 --qs "$A6" --out $I/r8_all6t.json
run --port 5199 --tier T2 --qs "$A6" --out $I/r8_t2all6t.json
run --port 5199 --qs "envlake=plate" --out $I/r8_plate.json
run --port 5199 --mobile --out $I/r8_t0.json
run --port 5199 --qs "fftip=0" --out $I/r8_fftip0.json
run --port 5199 --qs "lkglide=0" --out $I/r8_g0.json
run --port 5199 --qs "lktaa=0" --out $I/r8_lktaa0.json
echo "R3a $(( $(date +%s) - t0 ))s"
