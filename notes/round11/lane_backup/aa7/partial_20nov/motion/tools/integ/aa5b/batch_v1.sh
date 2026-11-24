#!/bin/bash
# AA5b batch 1: hypothesis variants on the medium path, rows 470-540, 100 frames (lane :5194 = AA3)
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5b
cd $W/tools
run() { local name=$1; shift; node cap.mjs --port 5194 --path medium --frames 100 --rows 470,540 --out $W/caps/v1_$name "$@"; }
run F
run H0 --qs "lkhalf=0"
run WD2 --qs "lkwdiv=2"
run MS1 --qs "lkmscale=1,1"
run NEAR0 --qs "lkwnear=0"
