#!/bin/zsh
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/perfcode
for q in "" "lktaa=0"; do n=${q:-def}; n=${n//=/}; node tools/ctxstep.mjs --port 5197 --qs "$q" --loss 0 --out g10/ctxstep/a7_${n}_L0; node tools/ctxstep.mjs --port 5197 --qs "$q" --loss 1 --out g10/ctxstep/a7_${n}_L1; done
node tools/ctxstep.mjs --port 5182 --loss 0 --out g10/ctxstep/base_L0; node tools/ctxstep.mjs --port 5182 --loss 1 --out g10/ctxstep/base_L1
