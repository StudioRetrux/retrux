#!/bin/zsh
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/perfcode
node tools/ident.mjs --port 5197 --qs "ffblock=0" --out ident/a7f0.json
node tools/ident.mjs --port 5197 --qs "ffblock=0&mirrorcost=0" --out ident/a7f0mc0.json
node tools/ident.mjs --port 5196 --qs "ffblock=0" --pre '(() => { const k = window.__hero.pipeline.aa.read.uAAKnee; const was = k.value; k.value = 1.0; return [was, k.value]; })()' --out ident/a6f0k.json
node tools/ident.mjs --port 5196 --pre '(() => { const k = window.__hero.pipeline.aa.read.uAAKnee; const was = k.value; k.value = 1.0; return [was, k.value]; })()' --out ident/a6k.json
