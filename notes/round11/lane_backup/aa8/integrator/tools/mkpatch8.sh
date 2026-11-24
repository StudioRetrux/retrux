#!/bin/bash
# AA8 integrator: aa8_vs_aa7.patch (vs lane aa7 = MAIN) and aa8.patch (vs aa3_base = BASE), labels a/retrux-web/<f> b/retrux-web/<f>
L=/Users/muhamadrifaldi/Library/Caches/retrux-lanes; W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/integ
FILES="app/hero/engine/HeroEngine.ts app/hero/engine/shaders/chunks.ts app/hero/engine/world/EnvEdge.ts app/hero/engine/world/LakeMirror.ts app/hero/engine/world/PlateEnvironment.ts app/hero/engine/world/Water.ts"
for pr in "aa7 aa8_vs_aa7.patch" "aa3_base aa8.patch"; do set -- $pr; A=$1; OUT=$W/$2; : > $OUT
  for f in $FILES; do diff -u --label a/retrux-web/$f --label b/retrux-web/$f $L/$A/retrux-web/$f $L/aa8/retrux-web/$f >> $OUT; done
  echo "== $2: $(wc -l < $OUT | tr -d ' ') lines, sha256 $(shasum -a 256 $OUT | cut -c1-64)"
  echo "   source differences $A vs aa8 outside the six files (excl. node_modules, dist, .next, tsbuildinfo, logs):"
  diff -rq -x node_modules -x dist -x .next -x '*.tsbuildinfo' -x '*.log' -x log $L/$A/retrux-web $L/aa8/retrux-web | grep -v -E "engine/HeroEngine.ts|shaders/chunks.ts|world/EnvEdge.ts|world/LakeMirror.ts|world/PlateEnvironment.ts|world/Water.ts" || echo "   none"
done
