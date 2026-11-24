#!/bin/zsh
# hold-only: is the chop's cost its noise (amp0: amplitudes 0, octaves 1-2 still computed, no extra tilted px) or its coverage?
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
W=$SP/work_p4/p4water
U='__hero.water.material.uniforms'
SLOT_BG=0 node $SP/slot/slot.mjs run "p4water:perf4h" -- node $W/tools/rc3h.mjs --vw 1440 --vh 766 --cycles 0 --restcycles 0 --holdcycles 6 --blockms 2500 --confs "def=5177|tier=T1&scale=1;amp0=5177|tier=T1&scale=1|$U.uLkP4C.value.x=0.0,$U.uLkP4C.value.y=0.0;nochop=5177|tier=T1&scale=1|$U.uLkP4C.value.z=0.0,$U.uLkP4C.value.w=0.001" --out $W/perf/split_hold2.json > $W/logs/perf4h.log 2>&1
echo "perf exit $?" >> $W/logs/perf4h.log
