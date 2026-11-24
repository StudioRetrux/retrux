#!/bin/zsh
# G7: one session per build variant, runtime toggles full (B + C) / none (A only), 60-frame blocks, paired per cycle; glide vs AA3
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/tools
for r in 1 2; do
  echo "== glide (default) run $r"; node perf2.mjs --port 5193 --path medium --block 60 --cycles 10 --batch 10 --confs full,none
  echo "== AA3 (lkglide=0) run $r"; node perf2.mjs --port 5193 --path medium --block 60 --cycles 10 --batch 10 --confs full,none --qs lkglide=0
done
