#!/bin/bash
# fixer: aa7.patch vs BASE (aa3_base), labels a/retrux-web/<f> b/retrux-web/<f>, + apply-test on a fresh clone of aa3_base
L=/Users/muhamadrifaldi/Library/Caches/retrux-lanes; W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/fixer
OUT=$W/aa7.patch; : > $OUT
FILES="app/hero/engine/HeroEngine.ts app/hero/engine/shaders/chunks.ts app/hero/engine/world/EnvEdge.ts app/hero/engine/world/LakeMirror.ts app/hero/engine/world/PlateEnvironment.ts app/hero/engine/world/Water.ts"
for f in $FILES; do diff -u --label a/retrux-web/$f --label b/retrux-web/$f $L/aa3_base/retrux-web/$f $L/aa7/retrux-web/$f >> $OUT; done
echo "== source differences lane vs BASE outside the six files (excluding node_modules, dist, .next, tsbuildinfo, logs):"
diff -rq -x node_modules -x dist -x .next -x '*.tsbuildinfo' -x '*.log' -x log $L/aa3_base/retrux-web $L/aa7/retrux-web | grep -v -E "engine/HeroEngine.ts|shaders/chunks.ts|world/EnvEdge.ts|world/LakeMirror.ts|world/PlateEnvironment.ts|world/Water.ts" || echo "   none"
rm -rf $L/aa7fx_apply; cp -c -R $L/aa3_base $L/aa7fx_apply
cd $L/aa7fx_apply && patch -p1 --dry-run < $OUT > /dev/null && patch -p1 < $OUT
echo "== .orig / .rej in the apply clone: $(find $L/aa7fx_apply -path '*/node_modules' -prune -o \( -name '*.orig' -o -name '*.rej' \) -print | wc -l | tr -d ' ')"
echo "== applied app folder vs lane app folder:"; diff -rq $L/aa7fx_apply/retrux-web/app $L/aa7/retrux-web/app && echo "   IDENTICAL (app/)"
cd $L/aa7fx_apply/retrux-web && npx tsc -p tsconfig.hero.json --noEmit; e1=$?; npx tsc -p tsconfig.json --noEmit --incremental false; e2=$?; echo "== apply-clone tsc hero $e1 project $e2"
wc -l $OUT; shasum -a 256 $OUT
