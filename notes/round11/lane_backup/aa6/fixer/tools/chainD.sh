#!/bin/zsh
# prejudge-glide chain D (after chain A): pump2 = long rest with the TAA handed over before k0 (--pre 40), sweep, 600-frame stop
# (still tail saved), restart. a6 / g0 / base (mask) / raw.
while pgrep -f "chainA.sh" > /dev/null; do sleep 5; done
t0=$(date +%s)
node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/slot/slot.mjs run 'aa6-pj-glide D1' -- zsh -c "node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/glide/tools/jcap.mjs --case pump2 --pre 40 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/glide/caps/pump2 --rows 380,766 --variants a6:5196,g0:5196:lkglide=0,base:5182:mask"
echo "D1 $(( $(date +%s) - t0 ))s DONE"
