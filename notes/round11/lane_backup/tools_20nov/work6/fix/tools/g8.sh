#!/bin/zsh
# fixer G8: the fixed AA6 (:5196) switch states vs fresh references (fixed1 + new v3 :5197, fixed1 + new F1 :5198) and the
# integrator's same-day idents of the unchanged builds (fixed1, BASE: deterministic across sessions, integrator section 3)
F=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/fix; I=$F/ident; T=$F/tools/integ
run() { node $T/aa3/ident.mjs "$@" > /dev/null 2>> $F/logs/g8.err; echo "done $*"; }
t0=$(date +%s)
run --port 5196 --out $I/aa6_t1.json
run --port 5196 --qs "lkglide=0" --out $I/aa6_t1_g0.json
run --port 5196 --qs "ffblock=0" --out $I/aa6_t1_f0.json
run --port 5196 --qs "lkglide=0&ffblock=0" --out $I/aa6_t1_g0f0.json
run --port 5196 --qs "aaresolve=0&slabflash=0&lktaa=0&lkglide=0&ffblock=0" --out $I/aa6_t1_alloff.json
run --port 5197 --out $I/fixed1v3n_t1.json
run --port 5198 --out $I/fixed1f1n_t1.json
run --port 5196 --qs "envlake=plate" --out $I/aa6_plate.json
run --port 5196 --mobile --out $I/aa6_t0.json
run --port 5196 --tier T2 --qs "aaresolve=0&slabflash=0&lktaa=0&lkglide=0&ffblock=0" --out $I/aa6_t2_alloff.json
echo "g8 $(( $(date +%s) - t0 ))s"
