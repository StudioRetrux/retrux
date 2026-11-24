#!/bin/zsh
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5c
cd $W
node tools/ident2.mjs --port 5195 --path hold --frames 400 --out ident/lane_hold.json
node tools/ident2.mjs --port 5195 --path hold --frames 400 --qs "mirrorcost=0" --out ident/lane_mc0_hold.json
node tools/ident2.mjs --port 5195 --path medium --frames 36 --vw 1920 --vh 1080 --out ident/lane_med1920.json
node tools/ident2.mjs --port 5195 --path medium --frames 36 --vw 1920 --vh 1080 --qs "mirrorcost=0" --out ident/lane_mc0_med1920.json
node tools/ident2.mjs --port 5195 --path medium --frames 24 --dsf 2 --out ident/lane_meddpr2.json
node tools/ident2.mjs --port 5195 --path medium --frames 24 --dsf 2 --qs "mirrorcost=0" --out ident/lane_mc0_meddpr2.json
