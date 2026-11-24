#!/bin/zsh
# G8 for AA4X: my lane ?gbaa=0 == AA3 (vs the AA3 builder's ident of its final lane: same tool, path, frames), all switches off
# == BASE (vs the AA3 builder's BASE idents), plate lake / T0 / T2 unchanged, my default build.
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work4/aa4x; mkdir -p ident
run() { node tools/ident.mjs "$@" > /dev/null; }
run --port 5191 --qs "gbaa=0" --out ident/x_t1_gb0.json
run --port 5191 --qs "aaresolve=0&slabflash=0&lktaa=0&gbaa=0" --out ident/x_t1_off.json
run --port 5191 --out ident/x_t1.json
run --port 5191 --qs "envlake=plate" --out ident/x_plate.json
run --port 5191 --mobile --out ident/x_t0.json
run --port 5191 --tier T2 --qs "aaresolve=0&slabflash=0&lktaa=0&gbaa=0" --out ident/x_t2_off.json
