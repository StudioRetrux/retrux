#!/bin/zsh
# AA4X batch 1: HDR env resolve (3 frames), GBAA debug tint (8 frames), medium 120 frames GBAA on / gbaa=0.
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work4/aa4x/tools
node hdrcap.mjs --port 5191 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work4/aa4x/caps/hdr_medium --path medium --ks 100,101,102
node cap.mjs --port 5191 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work4/aa4x/caps/medium_dbg --path medium --frames 8 --pre 130 --rows 380,766 --qs "gbaadbg=1"
node cap.mjs --port 5191 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work4/aa4x/caps/medium_X1 --path medium --frames 121 --rows 380,766
node cap.mjs --port 5191 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work4/aa4x/caps/medium_X1off --path medium --frames 121 --rows 380,766 --qs "gbaa=0"
