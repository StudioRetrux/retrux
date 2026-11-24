#!/bin/zsh
# batch 2: adaptive weight + band sigma variants (slow / medium 160)
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/tools
t0=$(date +%s)
cap() { node cap.mjs --port 5193 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/caps/$1_$2 --path $1 --frames 160 --rows 380,766 --qs "$3"; echo "$1_$2 t $(( $(date +%s) - t0 ))s"; }
for p in slow medium; do
  cap $p AD2 "lkgws=0.9&lkgwf=0.6&lkgv0=0.2&lkgv1=1.0"
  cap $p S3 "lkgsb=0.3"
  cap $p AD1S3 "lkgws=0.85&lkgwf=0.5&lkgv0=0.15&lkgv1=0.6&lkgsb=0.3"
  cap $p AD1S45 "lkgws=0.85&lkgwf=0.5&lkgv0=0.15&lkgv1=0.6&lkgsb=0.45"
  cap $p W85S3 "lkgws=0.85&lkgwf=0.85&lkgsb=0.3"
done
