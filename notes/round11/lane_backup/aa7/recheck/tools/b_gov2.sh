#!/bin/zsh
# recheck gov at DPR 2 (not run by the G-3 investigator or the fixer): final vs ?mrows=0 (pre-fix sizing) vs BASE, governor 1 / 0.9 / 0.8 / 0.7 / 1
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/recheck/tools/fx/ar; t0=$(date +%s)
node glide/jcap.mjs --case gov --dsf 2 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/recheck/caps/gov_dpr2 --rows 380,766 --variants "fin:5197,mr0:5197:mrows=0,base:5182:mask"; echo "gov dpr2 $(( $(date +%s) - t0 ))s"
