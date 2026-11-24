#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/glide; T=$W/tools; C=$W/caps; JM=$SP/work3/judge/motion/caps; G=$SP/work3/aa3/caps
cd $T
# real loop G6
until [[ -f $C/rl_medium_base/meta.json ]]; do sleep 5; done
nice -n 10 node rlana.mjs --mask $JM/base_medium $C/rl_medium_A6 $C/rl_medium_base $SP/work3/judge/motion-recheck/rl/fix_medium > $W/ana/rlana_medium.txt 2>&1; echo "rlana done $(date +%T)"
# L5 at 1x: fast a6 vs raw (BASE mask of the fast path), g0-equivalent not captured: AA3's fast_F vs aa5a's fast_raw is not the same build
until [[ -f $C/fast_A6raw/meta.json && -f $C/fast_A6/meta.json ]]; do sleep 5; done
nice -n 10 node l5g4.mjs $G/fast_base $C/fast_A6 $C/fast_A6raw --k1 119 > $W/ana/l5g4_fast.txt; echo "l5g4 fast done $(date +%T)"
# A-2: gov a6 vs raw, g0 vs raw per render scale
until [[ -f $C/gov/raw.log.txt ]]; do sleep 5; done
echo "== a6 vs raw" > $W/ana/A2_gov.txt; nice -n 10 node jg4s.mjs $C/gov/a6 $C/gov/raw >> $W/ana/A2_gov.txt; echo "== g0 vs raw" >> $W/ana/A2_gov.txt; nice -n 10 node jg4s.mjs $C/gov/g0 $C/gov/raw >> $W/ana/A2_gov.txt; echo "A2 done $(date +%T)"
