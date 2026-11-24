#!/bin/zsh
# AA8 tip ident: ?fftip=0 on :5198 vs the AA7 final's saved hashes (fixer's :5197 runs); default vs AA7
I=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/tip/ident; mkdir -p $I; cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/tip/tools; t0=$(date +%s)
run() { node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/tip/tools/identS.mjs "$@" > /dev/null 2>> /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/tip/logs/ident.err; echo "done $*" ; }
A5="aaresolve=0&slabflash=0&lktaa=0&lkglide=0&ffblock=0"
A6="aaresolve=0&slabflash=0&lktaa=0&lkglide=0&ffblock=0&mirrorcost=0"
run --port 5198 --qs "fftip=0" --out $I/p5198_t0def.json
run --port 5198 --out $I/p5198_def.json
run --port 5198 --qs "fftip=0&ffblock=0" --out $I/p5198_t0f0.json
run --port 5198 --qs "ffblock=0" --out $I/p5198_f0.json
run --port 5198 --qs "fftip=0&lkglide=0" --out $I/p5198_t0g0.json
run --port 5198 --qs "fftip=0&$A5" --out $I/p5198_t0all5.json
run --port 5198 --qs "fftip=0&mirrorcost=0" --out $I/p5198_t0mc0.json
run --port 5198 --scale 0.7 --qs "fftip=0" --out $I/p5198_t0s07.json
run --port 5198 --mobile --out $I/p5198_t0phone.json
run --port 5198 --qs "fftip=0&lkglide=0&mirrorcost=0" --out $I/p5198_t0g0mc0.json
run --port 5198 --qs "$A6" --out $I/p5198_all6.json
echo "i1 $(( $(date +%s) - t0 ))s"
