#!/bin/zsh
# G8: ref (aa3_fixed1 clone) vs lane ?mirrorcost=0 (and lane default), per-frame hashes + programs; T0 / plate via ident.mjs
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5c
cd $W
tools/lab.sh ref
node tools/ident2.mjs --port 5195 --path medium --frames 48 --out ident/g8/ref_med.json
node tools/ident2.mjs --port 5195 --path hold --frames 400 --out ident/g8/ref_hold.json
node tools/ident2.mjs --port 5195 --path medium --frames 36 --tier T2 --out ident/g8/ref_t2.json
node tools/ident.mjs --port 5195 --mobile --out ident/g8/ref_t0.json
node tools/ident.mjs --port 5195 --qs "envlake=plate" --out ident/g8/ref_plate.json
tools/lab.sh lane
node tools/ident2.mjs --port 5195 --path medium --frames 48 --qs "mirrorcost=0" --out ident/g8/lane_mc0_med.json
node tools/ident2.mjs --port 5195 --path medium --frames 48 --out ident/g8/lane_med.json
node tools/ident2.mjs --port 5195 --path hold --frames 400 --qs "mirrorcost=0" --out ident/g8/lane_mc0_hold.json
node tools/ident2.mjs --port 5195 --path medium --frames 36 --tier T2 --qs "mirrorcost=0" --out ident/g8/lane_mc0_t2.json
node tools/ident2.mjs --port 5195 --path medium --frames 36 --tier T2 --out ident/g8/lane_t2.json
node tools/ident.mjs --port 5195 --mobile --out ident/g8/lane_t0.json
node tools/ident.mjs --port 5195 --qs "envlake=plate" --out ident/g8/lane_plate.json
