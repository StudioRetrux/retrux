#!/bin/zsh
# g3 e1 (fix B on :5198): G8 idents + gov + medium 0.7 + reverse 0.7
I=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3/identB; mkdir -p $I; cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3/tools; t0=$(date +%s)
run() { node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3/tools/identS.mjs "$@" > /dev/null; echo "done $*" ; }
A5="aaresolve=0&slabflash=0&lktaa=0&lkglide=0&ffblock=0"
run --port 5198 --out $I/p5198_def.json
run --port 5198 --qs "ffblock=0" --out $I/p5198_f0.json
run --port 5198 --qs "lkglide=0" --out $I/p5198_g0.json
run --port 5198 --qs "$A5" --out $I/p5198_all5.json
run --port 5198 --scale 0.7 --qs "ffblock=0" --out $I/p5198_s07f0.json
run --port 5198 --scale 0.9 --qs "ffblock=0" --out $I/p5198_s09f0.json
run --port 5198 --scale 0.7 --qs "mrows=0" --out $I/p5198_s07mr0.json
run --port 5198 --scale 0.7 --out $I/p5198_s07.json
run --port 5198 --mobile --out $I/p5198_t0.json
run --port 5197 --mobile --out $I/p5197_t0.json
echo "e1 ident $(( $(date +%s) - t0 ))s"
node jcap.mjs --case gov --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3/caps/govB --rows 440,620 --variants "B:5198"
node cap.mjs --port 5198 --path medium --rows 380,766 --frames 120 --scale 0.7 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3/caps/med_s07_B
echo "e1 $(( $(date +%s) - t0 ))s"
