#!/bin/zsh
# G8 / G9 identity sequences
I=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/perf/ident
node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/perf/tools/idseq.mjs --port 5182 --out $I/base_t1.json
node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/perf/tools/idseq.mjs --port 5181 --qs "aaresolve=0&slabflash=0&lktaa=0" --out $I/lane_t1_off.json
node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/perf/tools/idseq.mjs --port 5181 --out $I/lane_t1.json
node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/perf/tools/idseq.mjs --port 5182 --out $I/base_t1_ctl.json
node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/perf/tools/idseq.mjs --port 5182 --tier T2 --out $I/base_t2.json
node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/perf/tools/idseq.mjs --port 5181 --tier T2 --qs "aaresolve=0&slabflash=0&lktaa=0" --out $I/lane_t2_off.json
