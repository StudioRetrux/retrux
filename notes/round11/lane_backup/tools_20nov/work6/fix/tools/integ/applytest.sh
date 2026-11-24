#!/bin/zsh
# Both patches apply with `patch -p1` (dry run, then real) on fresh APFS clones and reproduce the AA6 lane's sources exactly.
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/integ
L=/Users/muhamadrifaldi/Library/Caches/retrux-lanes
at() {  # $1 = reference lane, $2 = patch, $3 = test dir
  rm -rf $3 && mkdir -p $3 && cp -c -R $L/$1/retrux-web $3/retrux-web
  (cd $3 && patch -p1 --dry-run < $2 > /dev/null && patch -p1 < $2 > /dev/null && echo "$(basename $2) on fresh $1: APPLIED")
  diff -r -x node_modules -x dist -x .next -x '*.tsbuildinfo' -x next-env.d.ts $3/retrux-web $L/aa6/retrux-web && echo "  -> IDENTICAL to the AA6 lane (sources)"
  echo "  .orig/.rej: $(find $3/retrux-web -name '*.orig' -o -name '*.rej' | grep -v node_modules | wc -l | tr -d ' ')"
}
at aa3_base $W/aa6.patch $W/applytest/base
at aa3_fixed1 $W/aa6_vs_fixed1.patch $W/applytest/fixed1
cd $W/applytest/base/retrux-web && npx tsc -p tsconfig.hero.json --noEmit && npx tsc -p tsconfig.json --noEmit --incremental false && echo "  tsc hero + project clean on the patched BASE clone"
