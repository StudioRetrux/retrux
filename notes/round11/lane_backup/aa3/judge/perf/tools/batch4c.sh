#!/bin/zsh
I=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/perf/ident
node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/perf/tools/idseq.mjs --port 5182 --mobile --dbgtouch --scale none --out $I/base_t0d.json
node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/perf/tools/idseq.mjs --port 5181 --mobile --dbgtouch --scale none --out $I/lane_t0d.json
node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/perf/tools/idseq.mjs --port 5182 --mobile --dbgtouch --scale none --out $I/base_t0d_ctl.json
