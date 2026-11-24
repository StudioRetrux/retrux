#!/bin/zsh
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/perfcode
node tools/ident.mjs --port 5197 --qs "mirrorcost=0" --out ident/a7mc0.json
node tools/ident.mjs --port 5197 --qs "lkglide=0&mirrorcost=0" --out ident/a7g0mc0.json
node tools/ident.mjs --port 5196 --qs "lkglide=0" --out ident/a6g0.json
node tools/ident.mjs --port 5197 --qs "lkglide=0" --out ident/a7g0.json
