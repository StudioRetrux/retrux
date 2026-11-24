#!/bin/zsh
# batch 1: smoke, glide-off identity (medium 121), glide defaults (= AA3 values + tail), first candidates (slow / medium 160)
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/tools
t0=$(date +%s)
node cap.mjs --port 5193 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/caps/smoke --path medium --frames 3 --rows 380,766 || exit 1
if grep -qiE "error|warning" /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/caps/smoke/log.txt; then echo "SMOKE FAILED"; head -20 /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/caps/smoke/log.txt; exit 1; fi
echo "smoke ok $(( $(date +%s) - t0 ))s"
node cap.mjs --port 5193 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/caps/medium_off --path medium --frames 121 --rows 380,766 --qs "lkglide=0"; echo "t $(( $(date +%s) - t0 ))s"
cap() { node cap.mjs --port 5193 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/caps/$1_$2 --path $1 --frames 160 --rows 380,766 --qs "$3"; echo "$1_$2 t $(( $(date +%s) - t0 ))s"; }
for p in slow medium; do
  cap $p G0 ""
  cap $p W7 "lkgws=0.7&lkgwf=0.7"
  cap $p W85 "lkgws=0.85&lkgwf=0.85"
  cap $p AD1 "lkgws=0.85&lkgwf=0.5&lkgv0=0.15&lkgv1=0.6"
done
