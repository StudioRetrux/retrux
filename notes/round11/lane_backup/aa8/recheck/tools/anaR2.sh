#!/bin/zsh
# AA8 recheck: AJ-2 analysis of batch R2 (restored vs no-loss per frame; band check; determinism vs the fixer's final frames; images)
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/recheck; F=$W/tools/f; C=$W/ctx; FX=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/fixer/ctx
cd $C
: > $W/ana/aj2_rgbacmp.txt
for n in def lktaa0 envlakeplate; do for k in 0 1 2 3; do nice -n 10 node $F/pf/rgbacmp.mjs rc_${n}_L1_f$k.rgba rc_${n}_L0_f$k.rgba 1440 766 --flip >> $W/ana/aj2_rgbacmp.txt; done; done
for k in 0 1 2 3; do nice -n 10 node $F/pf/rgbacmp.mjs rc_t0_L1_f$k.rgba rc_t0_L0_f$k.rgba 390 844 --flip >> $W/ana/aj2_rgbacmp.txt; done
nice -n 10 node $F/bandchk.mjs $C rc 0 > $W/ana/aj2_bandchk.txt
nice -n 10 node $F/bandchk.mjs $C rc 2 >> $W/ana/aj2_bandchk.txt
: > $W/ana/aj2_vs_fixer.txt
for f in rc_*_f?.rgba; do g=${f/rc_/fin_}; if [[ -f $FX/$g ]]; then cmp -s $f $FX/$g && echo "$f == fixer $g" >> $W/ana/aj2_vs_fixer.txt || echo "$f DIFFERS from fixer $g" >> $W/ana/aj2_vs_fixer.txt; else echo "$f (no fixer file $g)" >> $W/ana/aj2_vs_fixer.txt; fi; done
nice -n 10 node $F/pf/rgbacmp.mjs rc_def_L1_f0.rgba rc_def_L0_f0.rgba 1440 766 $W/img/ctx_def_f0 --flip > /dev/null
nice -n 10 node $F/pf/rgbacmp.mjs rc_envlakeplate_L1_f0.rgba rc_envlakeplate_L0_f0.rgba 1440 766 $W/img/ctx_plate_f0 --flip > /dev/null
nice -n 10 node $F/pf/rgbacmp.mjs rc_t0_L1_f0.rgba rc_t0_L0_f0.rgba 390 844 $W/img/ctx_t0_f0 --flip > /dev/null
echo done
