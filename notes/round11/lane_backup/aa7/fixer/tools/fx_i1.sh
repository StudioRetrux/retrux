#!/bin/zsh
# fixer i1: re-prove the G-3 fix B identity on the final lane: final :5197 (aa7 + B) vs pre-fix AA7 :5199 (aa7pre clone)
I=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/fixer/ident; mkdir -p $I; cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/fixer/tools; t0=$(date +%s)
run() { node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/fixer/tools/identS.mjs "$@" > /dev/null 2>> /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/fixer/logs/ident.err; echo "done $*" ; }
A5="aaresolve=0&slabflash=0&lktaa=0&lkglide=0&ffblock=0"
for P in 5197 5199; do
  run --port $P --out $I/p${P}_def.json
  run --port $P --qs "ffblock=0" --out $I/p${P}_f0.json
  run --port $P --qs "lkglide=0" --out $I/p${P}_g0.json
  run --port $P --qs "$A5" --out $I/p${P}_all5.json
  run --port $P --qs "mirrorcost=0" --out $I/p${P}_mc0.json
  run --port $P --scale 0.7 --qs "ffblock=0" --out $I/p${P}_s07f0.json
  run --port $P --scale 0.9 --qs "ffblock=0" --out $I/p${P}_s09f0.json
  run --port $P --scale 0.7 --out $I/p${P}_s07.json
  run --port $P --mobile --out $I/p${P}_t0.json
done
run --port 5197 --scale 0.7 --qs "mrows=0" --out $I/p5197_s07mr0.json
echo "i1 $(( $(date +%s) - t0 ))s"
