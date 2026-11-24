#!/bin/zsh
# recheck id2: G8 switches on the final :5197 vs AA6 :5196 and BASE :5182 (fresh reference runs)
I=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/recheck/ident; cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/recheck/tools/fx; t0=$(date +%s)
run() { node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/recheck/tools/fx/identS.mjs "$@" > /dev/null 2>> /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/recheck/logs/ident.err; echo "$(date +%T) done $*"; }
A6="aaresolve=0&slabflash=0&lktaa=0&lkglide=0&ffblock=0&mirrorcost=0"
run --port 5197 --qs "lkglide=0&mirrorcost=0" --out $I/r5197_g0mc0.json
run --port 5196 --qs "lkglide=0" --out $I/r5196_g0.json
run --port 5197 --qs "$A6" --out $I/r5197_all6.json
run --port 5182 --out $I/r5182_def.json
run --port 5197 --tier T2 --qs "$A6" --out $I/r5197_t2all6.json
run --port 5182 --tier T2 --out $I/r5182_t2.json
run --port 5197 --qs "envlake=plate" --out $I/r5197_plate.json
run --port 5182 --qs "envlake=plate" --out $I/r5182_plate.json
run --port 5182 --mobile --out $I/r5182_t0.json
echo "id2 $(( $(date +%s) - t0 ))s"
