#!/bin/zsh
V=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/verify_int1
cd $V
node tools/t0shot.mjs 5199 t0/main_t90.png
node tools/t0shot.mjs 5173 t0/int1_t90.png
node tools/t0shot.mjs 5173 t0/int1off_t90.png 'p4env=0&p4ice=0&p4orb=0&p4hold=0'
echo T0 DONE
