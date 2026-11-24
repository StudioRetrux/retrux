#!/bin/zsh
# p4atmos patch vs int1: diff -u per changed file (+ the new file)
LANES=/Users/muhamadrifaldi/RetruxR11Work/lanes
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4atmos
OUT=$W/p4atmos_vs_int1.patch
: > $OUT
for f in app/hero/engine/HeroEngine.ts app/hero/engine/world/PlateEnvironment.ts; do
  diff -u --label a/retrux-web/$f --label b/retrux-web/$f $LANES/int1/retrux-web/$f $LANES/p4atmos/retrux-web/$f >> $OUT
done
f=app/hero/engine/p4atmos.ts
diff -u --label /dev/null --label b/retrux-web/$f /dev/null $LANES/p4atmos/retrux-web/$f >> $OUT
wc -l $OUT; shasum -a 256 $OUT
