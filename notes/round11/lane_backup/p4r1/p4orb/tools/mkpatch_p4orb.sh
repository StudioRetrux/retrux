#!/bin/bash
# p4orb: patch vs aa7 (labels a/retrux-web/<f> b/retrux-web/<f>) + apply test on a fresh clone of aa7 + tsc there
L=/Users/muhamadrifaldi/RetruxR11Work/lanes; W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4orb
OUT=$W/p4orb_vs_aa7.patch; : > $OUT
FILES="app/hero/engine/HeroEngine.ts app/hero/engine/hero/Orb.ts app/hero/engine/hero/Shards.ts app/hero/engine/pipeline/PostChain.ts app/hero/engine/quality.ts"
for f in $FILES; do diff -u --label a/retrux-web/$f --label b/retrux-web/$f $L/aa7/retrux-web/$f $L/p4orb/retrux-web/$f >> $OUT; done
echo "== source differences lane vs aa7 outside these files (excluding node_modules, dist, .next, tsbuildinfo, logs):"
diff -rq -x node_modules -x dist -x .next -x '*.tsbuildinfo' -x '*.log' -x log $L/aa7/retrux-web $L/p4orb/retrux-web | grep -v -E "engine/HeroEngine.ts|hero/Orb.ts|hero/Shards.ts|pipeline/PostChain.ts|engine/quality.ts" || echo "   none"
rm -rf $L/p4orb_apply; mkdir -p $L/p4orb_apply; cp -c -R $L/aa7/retrux-web $L/p4orb_apply/retrux-web
cd $L/p4orb_apply && patch -p1 --dry-run < $OUT > /dev/null && patch -p1 < $OUT
echo "== .orig / .rej in the apply clone: $(find $L/p4orb_apply -path '*/node_modules' -prune -o \( -name '*.orig' -o -name '*.rej' \) -print | wc -l | tr -d ' ')"
echo "== applied app folder vs lane app folder:"; diff -rq $L/p4orb_apply/retrux-web/app $L/p4orb/retrux-web/app && echo "   IDENTICAL (app/)"
cd $L/p4orb_apply/retrux-web && npx tsc -p tsconfig.hero.json --noEmit; e1=$?; npx tsc -p tsconfig.json --noEmit --incremental false; e2=$?; echo "== apply-clone tsc hero $e1 project $e2"
wc -l $OUT; shasum -a 256 $OUT
rm -rf $L/p4orb_apply
