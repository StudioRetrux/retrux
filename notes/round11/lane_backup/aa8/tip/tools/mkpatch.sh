#!/bin/bash
# AA8 tip: tip_vs_aa7.patch (labels a/retrux-web/<f> b/retrux-web/<f>) + apply-test on a fresh clone of aa7
L=/Users/muhamadrifaldi/Library/Caches/retrux-lanes; W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/tip
OUT=$W/tip_vs_aa7.patch; : > $OUT
FILES="app/hero/engine/world/Water.ts"
for f in $FILES; do diff -u --label a/retrux-web/$f --label b/retrux-web/$f $L/aa7/retrux-web/$f $L/aa8b/retrux-web/$f >> $OUT; done
echo "== source differences lane vs aa7 outside Water.ts (excluding node_modules, dist, .next, tsbuildinfo, logs):"
diff -rq -x node_modules -x dist -x .next -x '*.tsbuildinfo' -x '*.log' -x log $L/aa7/retrux-web $L/aa8b/retrux-web | grep -v -E "world/Water.ts" || echo "   none"
rm -rf $L/aa8b_apply; cp -c -R $L/aa7 $L/aa8b_apply
cd $L/aa8b_apply && patch -p1 --dry-run < $OUT > /dev/null && patch -p1 < $OUT
echo "== .orig / .rej in the apply clone: $(find $L/aa8b_apply -path '*/node_modules' -prune -o \( -name '*.orig' -o -name '*.rej' \) -print | wc -l | tr -d ' ')"
echo "== applied app folder vs lane app folder:"; diff -rq $L/aa8b_apply/retrux-web/app $L/aa8b/retrux-web/app && echo "   IDENTICAL (app/)"
cd $L/aa8b_apply/retrux-web && npx tsc -p tsconfig.hero.json --noEmit; e1=$?; npx tsc -p tsconfig.json --noEmit --incremental false; e2=$?; echo "== apply-clone tsc hero $e1 project $e2"
cd $L/aa8b/retrux-web && npx tsc -p tsconfig.hero.json --noEmit; e3=$?; npx tsc -p tsconfig.json --noEmit --incremental false; e4=$?; echo "== lane tsc hero $e3 project $e4"
wc -l $OUT; shasum -a 256 $OUT
rm -rf $L/aa8b_apply
