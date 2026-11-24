#!/bin/zsh
# recheck gov: the art judge's AR-1 (a) repro (jcap gov, rows 380-766) on the final build; mr0 = ?mrows=0 = AA7's pre-fix sizing (proven identical to pre-fix AA7 at every scale)
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/recheck/tools/fx/ar; t0=$(date +%s)
node glide/jcap.mjs --case gov --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/recheck/caps/gov --rows 380,766 --variants "fin:5197,mr0:5197:mrows=0,f0:5197:ffblock=0,base:5182:mask"; echo "gov $(( $(date +%s) - t0 ))s"
