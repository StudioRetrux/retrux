#!/bin/zsh
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/perfcode
I="node tools/ident.mjs"
node tools/ident.mjs --port 5197 --qs "aaresolve=0&slabflash=0&lktaa=0&lkglide=0&ffblock=0&mirrorcost=0" --out ident/a7off.json
node tools/ident.mjs --port 5182 --out ident/base.json
node tools/ident.mjs --port 5197 --tier T2 --qs "aaresolve=0&slabflash=0&lktaa=0&lkglide=0&ffblock=0&mirrorcost=0" --out ident/a7offT2.json
node tools/ident.mjs --port 5182 --tier T2 --out ident/baseT2.json
node tools/ident.mjs --port 5197 --qs "envlake=plate" --out ident/a7plate.json
node tools/ident.mjs --port 5182 --qs "envlake=plate" --out ident/baseplate.json
node tools/ident.mjs --port 5197 --mobile --out ident/a7T0.json --png img/a7T0_final.png
node tools/ident.mjs --port 5182 --mobile --out ident/baseT0.json --png img/baseT0_final.png
