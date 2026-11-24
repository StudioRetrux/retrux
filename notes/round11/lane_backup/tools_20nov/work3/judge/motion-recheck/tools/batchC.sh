#!/bin/zsh
# G8 identity (reduced): final image + lake targets + linked programs after a deterministic moving run
I=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3/tools/ident.mjs; O=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/motion-recheck/ident
t0=$(date +%s)
node $I --port 5182 --out $O/base_t1.json > /dev/null
node $I --port 5181 --qs "aaresolve=0&slabflash=0&lktaa=0" --out $O/lane_t1_off.json > /dev/null
node $I --port 5181 --out $O/lane_t1.json > /dev/null
node $I --port 5182 --qs "envlake=plate" --out $O/base_plate.json > /dev/null
node $I --port 5181 --qs "envlake=plate" --out $O/lane_plate.json > /dev/null
node $I --port 5182 --mobile --out $O/base_t0.json > /dev/null
node $I --port 5181 --mobile --out $O/lane_t0.json > /dev/null
echo "[batchC] ident took $(( $(date +%s) - t0 )) s"
echo BATCHC-DONE
