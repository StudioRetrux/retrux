#!/bin/zsh
# recheck G8 / G9 identity on the fixed lane (BASE references reused from the first judge run + one fresh BASE control)
I=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/perf-recheck/ident
node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/perf/tools/idseq.mjs --port 5181 --qs "aaresolve=0&slabflash=0&lktaa=0" --out $I/lane_t1_off.json
node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/perf/tools/idseq.mjs --port 5182 --out $I/base_t1_ctl2.json
node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/perf/tools/idseq.mjs --port 5181 --tier T2 --qs "aaresolve=0&slabflash=0&lktaa=0" --out $I/lane_t2_off.json
node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/perf/tools/idseq.mjs --port 5181 --qs "envlake=plate" --out $I/lane_plate.json
node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/perf/tools/idseq.mjs --port 5181 --mobile --dbgtouch --scale none --out $I/lane_t0d.json
node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/perf/tools/idseq.mjs --port 5181 --out $I/lane_t1.json
