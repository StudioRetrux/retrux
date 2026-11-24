#!/bin/zsh
# G8 identity (switches off == BASE) + rest identity
A=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3/tools; T=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/artifacts/tools; I=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/artifacts-recheck/ident; C=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/artifacts-recheck/caps
run() { node $A/ident.mjs "$@" > /dev/null; }
run --port 5182 --out $I/base_t1.json
run --port 5181 --qs "aaresolve=0&slabflash=0&lktaa=0" --out $I/lane_t1_off.json
run --port 5181 --qs "lktaa=0" --out $I/lane_t1_taa0.json
run --port 5181 --out $I/lane_t1.json
run --port 5182 --qs "envlake=plate" --out $I/base_plate.json
run --port 5181 --qs "envlake=plate" --out $I/lane_plate.json
run --port 5182 --mobile --out $I/base_t0.json
run --port 5181 --mobile --out $I/lane_t0.json
run --port 5182 --tier T2 --out $I/base_t2.json
run --port 5181 --tier T2 --qs "aaresolve=0&slabflash=0&lktaa=0" --out $I/lane_t2_off.json
node $T/jcap.mjs --case rest --out $C/rest --pre 30 --variants "base:5182:mask,lane:5181,aa0:5181:aaresolve=0,off:5181:lktaa=0" --eval2 "__hero.debug.freeze(true); __hero.lakeSched && __hero.lakeSched.invalidate()"
