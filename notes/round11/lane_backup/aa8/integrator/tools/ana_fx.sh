#!/bin/zsh
# AA8 integrator: the effects survived - P-1 context-restore frames (fresh ctxstep on :5199 vs the polish builder's AA7 / final
# frames) and the knee table's decisive cell (slow WR J48, exact events) on a fresh slow capture of :5199
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/integ; T=$W/tools; PC=$SP/work8/polish/g10/ctxstep
A5=$SP/work5/aa5a/caps; G=$SP/work3/aa3/caps; PK=$SP/work8/polish/caps
cd $W
echo "== P-1: extra restore damage of the TAA (def vs lktaa=0), I8 fresh"; node $T/ctxextra2.mjs ctx/i8_def ctx/i8_lktaa0 img/ctx_extra_i8_f0_x4.png
echo "== P-1: same, AA7 (polish builder's :5197 frames)"; node $T/ctxextra2.mjs $PC/a7_def $PC/a7_lktaa0 img/ctx_extra_a7_f0_x4.png
echo "== P-1: restored frame vs the plain resolve (?lktaa=0, same restore), I8 and AA7"
for k in 0 1 2 3; do echo "f$k I8 : $(node $T/pf/rgbacmp.mjs ctx/i8_def_L1_f$k.rgba ctx/i8_lktaa0_L1_f$k.rgba 1440 766)"; done
for k in 0 1; do echo "f$k AA7: $(node $T/pf/rgbacmp.mjs $PC/a7_def_L1_f$k.rgba $PC/a7_lktaa0_L1_f$k.rgba 1440 766)"; done
echo "== P-1: I8 fresh frames vs the polish builder's final-build frames (bit identity, raw RGBA)"
for n in def_L0 def_L1; do for k in 0 1 2 3; do cmp -s ctx/i8_${n}_f$k.rgba $PC/fd_${n}_f$k.rgba && r=SAME || r=DIFF; echo -n "$n f$k $r  "; done; echo; done
echo "== P-1: TAA state + console per run"
for f in ctx/i8_*_L?.json; do node -e 'const o=JSON.parse(require("fs").readFileSync(process.argv[1]));console.log(process.argv[1].split("/").pop(), JSON.stringify((o.res||[]).map(r=>({...r.taa, lost:r.lost, err:r.err}))), JSON.stringify(o.logs||[]))' $f; done
node $T/ctxstrip.mjs img/ctx_f0_x150-290_y548-580_A7loss_I8loss_I8noloss_z6.png 150,548,290,580 6 0 A7loss=$PC/a7_def_L1 I8loss=ctx/i8_def_L1 I8noloss=ctx/i8_def_L0
node $T/ctxstrip.mjs img/ctx_f0_x960-1440_y600-700_A7loss_I8loss_I8noloss_z2.png 960,600,1440,700 2 0 A7loss=$PC/a7_def_L1 I8loss=ctx/i8_def_L1 I8noloss=ctx/i8_def_L0
echo "== knee: fresh slow capture of :5199 vs the knee study's live-K 0.6 capture / K 1.0 (AA7)"
node $T/capcmp.mjs caps/slow_I8 $PK/slow_K06; node $T/capcmp.mjs caps/slow_I8 $PK/slow_K10
echo "== knee table decisive cell: slow WR J48 (L4; BASE 1071, GT 656 = -38.75 %, bar -33.75 %)"
node $T/mo/j48loc.mjs $A5/slow_mask WR 48 1 159 2 BASE=$G/slow_base A6=$PK/slow_A6 I8=caps/slow_I8 K06=$PK/slow_K06 K10=$PK/slow_K10 GT=$G/slow_gt 2>&1 | head -3
