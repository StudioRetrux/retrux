#!/bin/zsh
# final build: G8 idents again (marker-stripped sources), default == X7 images, fast path for G2, G10
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work4/aa4x
zsh tools/g8.sh
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work4/aa4x/tools
node cap.mjs --port 5191 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work4/aa4x/caps/medium_final --path medium --frames 60 --rows 380,766
node cap.mjs --port 5191 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work4/aa4x/caps/fast_X7 --path fast --frames 180 --rows 380,766
node g10.mjs --port 5191 > /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work4/aa4x/ana/g10.txt 2>&1
