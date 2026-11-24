#!/bin/zsh
# fixer g8: the final lane's switches vs AA6 :5196 and BASE :5182 (identS = ident.mjs + --scale; scale 1)
I=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/fixer/ident; mkdir -p $I; cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/fixer/tools; t0=$(date +%s)
run() { node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/fixer/tools/identS.mjs "$@" > /dev/null 2>> /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/fixer/logs/ident.err; echo "done $*" ; }
A6="aaresolve=0&slabflash=0&lktaa=0&lkglide=0&ffblock=0&mirrorcost=0"
run --port 5197 --qs "lkglide=0&mirrorcost=0" --out $I/p5197_g0mc0.json
run --port 5196 --qs "lkglide=0" --out $I/p5196_g0.json
run --port 5197 --qs "$A6" --out $I/p5197_all6.json
run --port 5182 --out $I/p5182_def.json
run --port 5197 --tier T2 --qs "$A6" --out $I/p5197_t2all6.json
run --port 5182 --tier T2 --out $I/p5182_t2.json
run --port 5197 --qs "envlake=plate" --out $I/p5197_plate.json
run --port 5182 --qs "envlake=plate" --out $I/p5182_plate.json
run --port 5182 --mobile --out $I/p5182_t0.json
echo "g8 $(( $(date +%s) - t0 ))s"
