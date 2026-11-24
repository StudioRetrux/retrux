#!/bin/zsh
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5c
cd $W
node tools/ident2.mjs --port 5195 --path medium --frames 48 --out ident/cap_med.json
node tools/ident2.mjs --port 5195 --path fast --frames 48 --out ident/cap_fast.json
node tools/ident2.mjs --port 5195 --path slow --frames 72 --out ident/cap_slow.json
node tools/ident2.mjs --port 5195 --path hold --frames 400 --out ident/cap_hold.json
node tools/ident2.mjs --port 5195 --path medium --frames 36 --vw 1920 --vh 1080 --out ident/cap_med1920.json
node tools/ident2.mjs --port 5195 --path medium --frames 24 --dsf 2 --out ident/cap_meddpr2.json
