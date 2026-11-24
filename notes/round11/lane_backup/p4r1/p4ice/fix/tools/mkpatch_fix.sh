#!/bin/zsh
# fixer: the lane patch vs aa7 (== MAIN), every changed file, + an apply test on a scratch copy of aa7's IceMaterial.ts
L=/Users/muhamadrifaldi/RetruxR11Work/lanes; W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4ice
OUT=$W/p4ice_vs_aa7.patch; : > $OUT
for f in $(cd $L/p4ice/retrux-web && diff -rq -x node_modules -x dist -x .next -x '*.tsbuildinfo' -x '*.log' -x log $L/aa7/retrux-web/app $L/p4ice/retrux-web/app | sed -n 's#^Files .*/aa7/retrux-web/\(.*\) and .*#\1#p'); do
  diff -u --label a/retrux-web/$f --label b/retrux-web/$f $L/aa7/retrux-web/$f $L/p4ice/retrux-web/$f >> $OUT; echo "changed: $f"; done
echo "== other differences (new / removed files):"; diff -rq -x node_modules -x dist -x .next -x '*.tsbuildinfo' -x '*.log' -x log $L/aa7/retrux-web/app $L/p4ice/retrux-web/app | grep -v "^Files " || echo "   none"
T=$W/fix/applytest; rm -rf $T; mkdir -p $T/retrux-web/app/hero/engine/hero; cp $L/aa7/retrux-web/app/hero/engine/hero/IceMaterial.ts $T/retrux-web/app/hero/engine/hero/
(cd $T && patch -p1 -s < $OUT) && cmp $T/retrux-web/app/hero/engine/hero/IceMaterial.ts $L/p4ice/retrux-web/app/hero/engine/hero/IceMaterial.ts && echo "== apply test: patched aa7 file == lane file"
wc -l $OUT; shasum -a 256 $OUT
