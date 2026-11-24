#!/bin/zsh
# batch 3: band blur off / sharper history resample (slow / medium 160)
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/tools
t0=$(date +%s)
cap() { node cap.mjs --port 5193 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/caps/$1_$2 --path $1 --frames 160 --rows 380,766 --qs "$3"; echo "$1_$2 t $(( $(date +%s) - t0 ))s"; }
for p in slow medium; do
  cap $p W85S0 "lkgws=0.85&lkgwf=0.85&lkgsb=0"
  cap $p W85S3R1 "lkgws=0.85&lkgwf=0.85&lkgsb=0.3&lkgres=-1"
  cap $p W85S0R1 "lkgws=0.85&lkgwf=0.85&lkgsb=0&lkgres=-1"
  cap $p W7S3R1 "lkgws=0.7&lkgwf=0.7&lkgsb=0.3&lkgres=-1"
  cap $p AD3S3R1 "lkgws=0.85&lkgwf=0.6&lkgv0=0.3&lkgv1=1.2&lkgsb=0.3&lkgres=-1"
done
