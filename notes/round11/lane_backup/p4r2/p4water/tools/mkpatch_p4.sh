#!/bin/bash
# p4water_vs_aa8.patch (labels a/retrux-web/<f> b/retrux-web/<f>) + apply test on a fresh clone of aa8
L=/Users/muhamadrifaldi/RetruxR11Work/lanes; W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4water
OUT=$W/p4water_vs_aa8.patch; : > $OUT
CH=$(cd $L/p4water/retrux-web && diff -rq -x node_modules -x dist -x .next -x '*.tsbuildinfo' -x '*.log' -x log -x hero-lab $L/aa8/retrux-web . | sed -n 's#^Files .*/aa8/retrux-web/\(.*\) and .* differ$#\1#p')
echo "== changed files: $CH"
for f in $CH; do diff -u --label a/retrux-web/$f --label b/retrux-web/$f $L/aa8/retrux-web/$f $L/p4water/retrux-web/$f >> $OUT; done
echo "== only-in (new files) outside node_modules/dist/.next:"; (cd $L/p4water/retrux-web && diff -rq -x node_modules -x dist -x .next -x '*.tsbuildinfo' -x '*.log' -x log $L/aa8/retrux-web . | grep "^Only in" ) || echo "   none"
rm -rf $L/p4water_apply; cp -c -R $L/aa8 $L/p4water_apply
cd $L/p4water_apply && patch -p1 --dry-run < $OUT > /dev/null && patch -p1 < $OUT
echo "== .orig / .rej in the apply clone: $(find $L/p4water_apply -path '*/node_modules' -prune -o \( -name '*.orig' -o -name '*.rej' \) -print | wc -l | tr -d ' ')"
echo "== applied app folder vs lane app folder:"; diff -rq $L/p4water_apply/retrux-web/app $L/p4water/retrux-web/app && echo "   IDENTICAL (app/)"
cd $L/p4water_apply/retrux-web && npx tsc -p tsconfig.hero.json --noEmit; e1=$?; npx tsc -p tsconfig.json --noEmit --incremental false; e2=$?; echo "== apply-clone tsc hero $e1 project $e2"
rm -rf $L/p4water_apply
wc -l $OUT; shasum -a 256 $OUT
