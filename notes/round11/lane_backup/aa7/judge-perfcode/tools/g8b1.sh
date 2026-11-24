#!/bin/zsh
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/perfcode
node tools/ident.mjs --port 5197 --qs "aaresolve=0&slabflash=0&lktaa=0&lkglide=0&ffblock=0&mirrorcost=0" --out ident/a7off.json
node tools/ident.mjs --port 5182 --out ident/base.json --png img/base_final.png
node tools/ident.mjs --port 5197 --tier T2 --qs "aaresolve=0&slabflash=0&lktaa=0&lkglide=0&ffblock=0&mirrorcost=0" --out ident/a7offT2.json
node tools/ident.mjs --port 5182 --tier T2 --out ident/baseT2.json
