#!/bin/zsh
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5c
cd $W
node tools/ident2.mjs --port 5195 --path medium --frames 48 --out ident/lane_med.json
node tools/ident2.mjs --port 5195 --path medium --frames 48 --qs "mirrorcost=0" --out ident/lane_mc0_med.json
node tools/ident2.mjs --port 5195 --path fast --frames 48 --out ident/lane_fast.json
node tools/ident2.mjs --port 5195 --path fast --frames 48 --qs "mirrorcost=0" --out ident/lane_mc0_fast.json
