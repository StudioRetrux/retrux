#!/bin/zsh
# fixer k (M-1 option 2 DATA ONLY, no code change): the final lane :5197 with the knee set live to 0.75 (the shared uAAKnee
# object of the writers and readers; HeroEngine sets it once at init), slow 160 + medium 240, cap.mjs rows 380-766
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/fixer/tools; t0=$(date +%s)
EV="window.__hero.pipeline.aa.read.uAAKnee.value = 0.75"
node cap.mjs --port 5197 --path slow --rows 380,766 --frames 160 --eval "$EV" --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/fixer/caps/slow_K075 > /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/fixer/logs/k_slow.log 2>&1; echo "slow $(( $(date +%s) - t0 ))s"
node cap.mjs --port 5197 --path medium --rows 380,766 --frames 240 --eval "$EV" --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/fixer/caps/medium_K075 > /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/fixer/logs/k_med.log 2>&1; echo "medium $(( $(date +%s) - t0 ))s"
