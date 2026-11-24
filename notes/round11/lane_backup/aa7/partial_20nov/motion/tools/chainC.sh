#!/bin/zsh
# prejudge-glide chain C (after chain B): the unblurred resolve (?envedge=0) for L5 / A-2 references: fast 240 (cap.mjs), gov + pump (jcap)
while pgrep -f "chainB.sh" > /dev/null; do sleep 5; done
t0=$(date +%s)
node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/slot/slot.mjs run 'aa6-pj-glide C1' -- zsh -c "node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/glide/tools/cap.mjs --port 5196 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/glide/caps/fast_A6raw --path fast --rows 380,766 --qs envedge=0; node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/glide/tools/jcap.mjs --case gov --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/glide/caps/gov --rows 380,766 --variants raw:5196:envedge=0"
echo "C1 $(( $(date +%s) - t0 ))s DONE"
