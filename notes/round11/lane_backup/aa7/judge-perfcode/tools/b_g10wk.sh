#!/bin/zsh
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/perfcode
export PLAYWRIGHT_BROWSERS_PATH=/Users/muhamadrifaldi/RetruxR11Work/ms-playwright
node tools/g10x.mjs --engine webkit --outdir g10/webkit > g10/webkit/out.txt 2>&1
node tools/g10x.mjs --engine webkit --outdir g10/webkit_mc0 --qs "mirrorcost=0" > g10/webkit_mc0/out.txt 2>&1
