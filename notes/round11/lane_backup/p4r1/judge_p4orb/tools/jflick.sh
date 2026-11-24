#!/bin/zsh
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4orb
F=$J/tools/flick.mjs; O=$J/flick
node $F --port 5176 --mode hold --frames 16 --out $O --tag lane
node $F --port 5176 --qs p4orb=0 --mode hold --frames 16 --out $O --tag off
node $F --port 5176 --mode rest --frames 16 --out $O --tag lane
node $F --port 5176 --qs p4orb=0 --mode rest --frames 16 --out $O --tag off
