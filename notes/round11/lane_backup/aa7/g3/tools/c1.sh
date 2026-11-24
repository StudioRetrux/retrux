#!/bin/bash
# g3 c1: gov case (a7 = AA7 :5197, g3 = fix :5198, f0 = AA7 ?ffblock=0, base :5182), rows 440-620
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3/tools; t0=$(date +%s)
node jcap.mjs --case gov --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3/caps/gov --rows 440,620 --variants "a7:5197,g3:5198,f0:5197:ffblock=0,base:5182"
echo "t $(( $(date +%s) - t0 ))s"
