#!/bin/zsh
# p4hold: stepped restore runs on :5178 (re-read panorama), loss 0 / 1 per config
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4hold
cd $W
for L in 0 1; do
  node tools/ctxstep.mjs --port 5178 --loss $L --out ctx/def_L$L
  node tools/ctxstep.mjs --port 5178 --qs lktaa=0 --loss $L --out ctx/lktaa0_L$L
  node tools/ctxstep.mjs --port 5178 --qs envlake=plate --loss $L --out ctx/plate_L$L
  node tools/ctxstep.mjs --port 5178 --mobile --loss $L --out ctx/t0_L$L
done
