#!/bin/zsh
# recheck id1: G-3 fix B identity on the final :5197 (identS = ident.mjs + --scale), compared later with the fixer's saved pre-fix AA7 hashes (p5199_*.json)
I=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/recheck/ident; cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/recheck/tools/fx; t0=$(date +%s)
run() { node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/recheck/tools/fx/identS.mjs "$@" > /dev/null 2>> /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/recheck/logs/ident.err; echo "$(date +%T) done $*"; }
A5="aaresolve=0&slabflash=0&lktaa=0&lkglide=0&ffblock=0"
run --port 5197 --out $I/r5197_def.json
run --port 5197 --qs "ffblock=0" --out $I/r5197_f0.json
run --port 5197 --qs "lkglide=0" --out $I/r5197_g0.json
run --port 5197 --qs "$A5" --out $I/r5197_all5.json
run --port 5197 --qs "mirrorcost=0" --out $I/r5197_mc0.json
run --port 5197 --qs "mrows=0" --out $I/r5197_mr0.json
run --port 5197 --mobile --out $I/r5197_t0.json
run --port 5197 --scale 0.7 --out $I/r5197_s07.json
run --port 5197 --scale 0.7 --qs "ffblock=0" --out $I/r5197_s07f0.json
run --port 5197 --scale 0.7 --qs "mrows=0" --out $I/r5197_s07mr0.json
run --port 5197 --scale 0.9 --qs "ffblock=0" --out $I/r5197_s09f0.json
echo "id1 $(( $(date +%s) - t0 ))s"
