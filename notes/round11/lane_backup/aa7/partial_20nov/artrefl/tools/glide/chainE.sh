#!/bin/zsh
# prejudge-glide chain E: DPR 2 (re-run after the iCloud stall; tools now use the scratch playwright-core copy)
t0=$(date +%s)
node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/slot/slot.mjs run 'aa6-pj-glide E1' -- zsh -c "node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/glide/tools/jcap.mjs --case dpr2 --dsf 2 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/glide/caps/dpr2 --rows 380,766 --variants a6:5196,g0:5196:lkglide=0,raw:5196:envedge=0"
echo "E1 $(( $(date +%s) - t0 ))s DONE"
