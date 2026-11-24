#!/bin/zsh
# batch 4: moderate weights with the band blur off; step clamp (mode 3) at high weights (slow / medium 160)
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/tools
t0=$(date +%s)
cap() { node cap.mjs --port 5193 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/caps/$1_$2 --path $1 --frames 160 --rows 380,766 --qs "$3"; echo "$1_$2 t $(( $(date +%s) - t0 ))s"; }
for p in slow medium; do
  cap $p W7S3 "lkgws=0.7&lkgwf=0.7&lkgsb=0.3"
  cap $p AD4S3 "lkgws=0.8&lkgwf=0.5&lkgv0=0.1&lkgv1=0.5&lkgsb=0.3"
  cap $p W85S3K1 "lkgws=0.85&lkgwf=0.85&lkgsb=0.3&lkgclip=3&lkggam=1"
  cap $p W9S3K1 "lkgws=0.9&lkgwf=0.9&lkgsb=0.3&lkgclip=3&lkggam=1"
  cap $p W85S3K15 "lkgws=0.85&lkgwf=0.85&lkgsb=0.3&lkgclip=3&lkggam=1.5"
  cap $p W85S3G1 "lkgws=0.85&lkgwf=0.85&lkgsb=0.3&lkggam=1.0"
done
