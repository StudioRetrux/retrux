#!/bin/zsh
# g3 i1: G8 idents (identS.mjs: 20 moving frames, final + lake targets + every linked program) AA7 :5197 vs g3 :5198
I=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3/ident; mkdir -p $I; cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3/tools
run() { node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3/tools/identS.mjs "$@" > /dev/null; echo "done $*" ; }
t0=$(date +%s)
A5="aaresolve=0&slabflash=0&lktaa=0&lkglide=0&ffblock=0"
for P in 5197 5198; do
  run --port $P --out $I/p${P}_def.json
  run --port $P --qs "ffblock=0" --out $I/p${P}_f0.json
  run --port $P --qs "lkglide=0" --out $I/p${P}_g0.json
  run --port $P --qs "$A5" --out $I/p${P}_all5.json
  run --port $P --scale 0.7 --qs "ffblock=0" --out $I/p${P}_s07f0.json
  run --port $P --scale 0.9 --qs "ffblock=0" --out $I/p${P}_s09f0.json
  run --port $P --scale 0.7 --out $I/p${P}_s07.json
done
run --port 5198 --scale 0.7 --qs "ffbs=0" --out $I/p5198_s07fs0.json
run --port 5198 --qs "ffbs=0" --out $I/p5198_fs0.json
echo "i1 $(( $(date +%s) - t0 ))s"
