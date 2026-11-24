#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/motion; T=$W/tools; C=$W/caps; JM=$SP/work3/judge/motion/caps; G=$SP/work3/aa3/caps
until [[ -f $C/rl_medium_base/meta.json ]]; do sleep 4; done; sleep 2
cd $T; nice -n 10 node rlana.mjs --mask $JM/base_medium $C/rl_medium_A8 $C/rl_medium_A7 $C/rl_medium_base > $W/ana/g6_rl_medium.txt 2>&1; echo "$(date +%T) rlana" >> $W/logs/anaR.out
until [[ -f $C/fast_A8raw/meta.json ]]; do sleep 5; done; sleep 2
nice -n 10 node l5g4.mjs $G/fast_base $C/fast_A8 $C/fast_A8raw --k1 119 > $W/ana/l5g4_fast_a8_raw.txt 2>&1; echo "$(date +%T) l5g4 fast" >> $W/logs/anaR.out
until [[ -f $C/leavere/base/meta.json ]]; do sleep 5; done; sleep 2
nice -n 10 node evt.mjs $C/leavere --a a8 --b a7 --m base > $W/ana/evt_leavere_a8a7.txt 2>&1
for w in "1 8" "36 46" "76 90"; do nice -n 10 node stepcnt.mjs $C/leavere a8,a7,g0,base ${=w} >> $W/ana/stepcnt_leavere.txt 2>&1; done; echo "$(date +%T) leavere" >> $W/logs/anaR.out
until [[ -f $C/dpr2/base/meta.json ]]; do sleep 5; done; sleep 2
nice -n 10 node evt.mjs $C/dpr2 --a a8 --b a7 --m base > $W/ana/evt_dpr2_a8a7.txt 2>&1
nice -n 10 node l5g4.mjs $C/dpr2/base $C/dpr2/a8 $C/dpr2/raw > $W/ana/l5g4_dpr2_a8_raw.txt 2>&1; echo "$(date +%T) dpr2" >> $W/logs/anaR.out
