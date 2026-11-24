#!/bin/zsh
# int1 deterministic shots (the env judge's abshots.mjs: RAF off, frame stepping, same sim time per shot as the judge's ab/m, ab/l)
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/int1
cd $W
node tools/abshots.mjs 5173 ab/i > ab/i.log 2>&1
node tools/abshots.mjs 5173 ab/ie 'p4ice=0&p4orb=0&p4hold=0' > ab/ie.log 2>&1
node tools/abshots.mjs 5199 ab/m8 > ab/m8.log 2>&1
echo AB done
