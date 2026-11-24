#!/bin/zsh
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5c
cd $W
for k in 4 5 6; do node tools/ident2.mjs --port 5195 --path medium --frames 48 --qs "lkmmax=$k" --out ident/lane_mm${k}_med.json; done
node tools/ident2.mjs --port 5195 --path rest --frames 24 --out ident/lane_rest.json
node tools/ident2.mjs --port 5195 --path rest --frames 24 --qs "lkmmax=5" --out ident/lane_mm5_rest.json
