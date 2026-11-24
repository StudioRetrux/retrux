#!/bin/zsh
# AA6 G8 batch B: plate / T0 / T2 vs BASE
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/integ
I=$W/ident; mkdir -p $I
run() { node $W/tools/aa3/ident.mjs "$@" > /dev/null; echo "done $*" ; }
t0=$(date +%s)
run --port 5196 --qs "envlake=plate" --out $I/aa6_plate.json
run --port 5182 --qs "envlake=plate" --out $I/base_plate.json
run --port 5196 --mobile --out $I/aa6_t0.json
run --port 5182 --mobile --out $I/base_t0.json
run --port 5196 --tier T2 --qs "aaresolve=0&slabflash=0&lktaa=0&lkglide=0&ffblock=0" --out $I/aa6_t2_alloff.json
run --port 5182 --tier T2 --out $I/base_t2.json
echo "batch B $(( $(date +%s) - t0 ))s"
run --port 5197 --out $I/fixed1f1_t1.json
node $W/tools/progsrc.mjs --port 5196 --out $W/progsrc/aa6
node $W/tools/progsrc.mjs --port 5196 --qs "lkglide=0" --out $W/progsrc/aa6_g0
echo "batch B+ $(( $(date +%s) - t0 ))s"
