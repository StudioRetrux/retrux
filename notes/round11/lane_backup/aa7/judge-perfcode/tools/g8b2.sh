#!/bin/zsh
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/perfcode
node tools/ident.mjs --port 5197 --qs "envlake=plate" --out ident/a7plate.json
node tools/ident.mjs --port 5182 --qs "envlake=plate" --out ident/baseplate.json
node tools/ident.mjs --port 5197 --mobile --out ident/a7T0.json --png img/a7T0_final.png
node tools/ident.mjs --port 5182 --mobile --out ident/baseT0.json --png img/baseT0_final.png
