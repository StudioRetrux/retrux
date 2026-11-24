#!/bin/bash
# g3: patch vs AA7 (labels a/retrux-web/... b/retrux-web/...) + apply-test on a fresh clone of aa7
L=/Users/muhamadrifaldi/Library/Caches/retrux-lanes; G=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/g3
OUT=$G/aa7g3_vs_aa7.patch; : > $OUT
for f in app/hero/engine/HeroEngine.ts app/hero/engine/world/LakeMirror.ts; do
  diff -u --label a/retrux-web/$f --label b/retrux-web/$f $L/aa7/retrux-web/$f $L/aa7g3/retrux-web/$f >> $OUT
done
# every other source file unchanged vs aa7?
diff -rq -x node_modules -x dist -x .next -x '*.tsbuildinfo' -x log $L/aa7/retrux-web $L/aa7g3/retrux-web | grep -v -E "HeroEngine.ts|world/LakeMirror.ts" || echo "no other differences"
rm -rf $L/aa7g3_apply; cp -c -R $L/aa7 $L/aa7g3_apply
cd $L/aa7g3_apply && patch -p1 --dry-run < $OUT && patch -p1 < $OUT
for f in app/hero/engine/HeroEngine.ts app/hero/engine/world/LakeMirror.ts; do cmp $L/aa7g3_apply/retrux-web/$f $L/aa7g3/retrux-web/$f && echo "applied == lane: $f"; done
cd $L/aa7g3_apply/retrux-web && npx tsc -p tsconfig.hero.json --noEmit && npx tsc -p tsconfig.json --noEmit --incremental false && echo "apply-test tsc OK"
wc -l $OUT
