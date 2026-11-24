#!/bin/zsh
# AA6 G8 batch A: AA6 lane (:5196) switch states + references (fixed1 clone :5197, fixed1+v3 clone :5198, BASE :5182)
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/integ
I=$W/ident; mkdir -p $I
run() { node $W/tools/aa3/ident.mjs "$@" > /dev/null; echo "done $*" ; }
t0=$(date +%s)
run --port 5196 --out $I/aa6_t1.json
run --port 5196 --qs "lkglide=0" --out $I/aa6_t1_g0.json
run --port 5196 --qs "ffblock=0" --out $I/aa6_t1_f0.json
run --port 5196 --qs "lkglide=0&ffblock=0" --out $I/aa6_t1_g0f0.json
run --port 5196 --qs "aaresolve=0&slabflash=0&lktaa=0&lkglide=0&ffblock=0" --out $I/aa6_t1_alloff.json
run --port 5197 --out $I/fixed1_t1.json
run --port 5198 --out $I/fixed1v3_t1.json
run --port 5182 --out $I/base_t1.json
echo "batch A $(( $(date +%s) - t0 ))s"
