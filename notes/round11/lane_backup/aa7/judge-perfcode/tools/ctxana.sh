#!/bin/zsh
# per config: loss=1 vs loss=0 for the 4 frames after the restore (frame k = k+1-th frame after it)
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/perfcode
for c in a7_def a7_lktaa0 base; do for k in 0 1 2 3; do
  [ -f g10/ctxstep/${c}_L1_f$k.rgba ] || continue
  P=""; [ $k = 0 ] && P=g10/ctxstep/cmp_${c}_f0
  echo -n "$c f$k "; node tools/rgbacmp.mjs g10/ctxstep/${c}_L1_f$k.rgba g10/ctxstep/${c}_L0_f$k.rgba 1440 766 $P --flip
done; done
