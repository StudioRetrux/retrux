#!/bin/bash
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5b
cd $W/tools
run() { local name=$1; shift; node cap.mjs --port 5194 --path medium --frames 100 --rows 470,540 --out $W/caps/v2_$name "$@"; }
run FF
run FF0 --qs "ffblock=0"
