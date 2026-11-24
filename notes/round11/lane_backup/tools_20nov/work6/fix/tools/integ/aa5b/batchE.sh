#!/bin/bash
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5b
cd $W/tools
node cap.mjs --port 5194 --path rest --frames 40 --rows 380,766 --out $W/caps/rest_v3
node cap.mjs --port 5194 --path rest --frames 40 --rows 380,766 --qs "ffblock=0" --out $W/caps/rest_F0
node cap.mjs --port 5194 --path hold --frames 420 --rows 380,766 --out $W/caps/hold_v3
node cap.mjs --port 5194 --path hold --frames 420 --rows 380,766 --qs "ffblock=0" --out $W/caps/hold_F0
