#!/bin/zsh
# recheck A-4 (reverse pale block) + A-3 (medium vs GT)
A=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3/tools; C=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/artifacts-recheck/caps
node $A/cap.mjs --port 5181 --out $C/reverse_F2 --path reverse --frames 240 --rows 380,766
node $A/cap.mjs --port 5181 --out $C/medium_F2 --path medium --frames 240 --rows 380,766
