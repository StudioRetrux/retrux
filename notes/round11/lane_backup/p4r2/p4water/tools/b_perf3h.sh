#!/bin/zsh
# hold-only split of G2's cost on the lane: A default, B chop off (fade band 0), C spec AA off, D ?lkchop=0 (G2 off), E main
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
W=$SP/work_p4/p4water
U='__hero.water.material.uniforms'
SLOT_BG=0 node $SP/slot/slot.mjs run "p4water:perf3h" -- node $W/tools/rc3h.mjs --vw 1440 --vh 766 --cycles 0 --restcycles 0 --holdcycles 6 --blockms 2500 --confs "def=5177|tier=T1&scale=1;nochop=5177|tier=T1&scale=1|$U.uLkP4C.value.z=0.0,$U.uLkP4C.value.w=0.001;nosaa=5177|tier=T1&scale=1|$U.uLkP4W.value.w=0.0;g2off=5177|tier=T1&scale=1&lkchop=0;main=5199|tier=T1&scale=1" --out $W/perf/split_hold1.json > $W/logs/perf3h.log 2>&1
echo "perf exit $?" >> $W/logs/perf3h.log
