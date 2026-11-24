#!/bin/zsh
# Proves aa5a.patch applies with `patch -p1` on a fresh APFS clone of aa3_judged and reproduces my lane's sources exactly.
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a
T=$W/applytest
rm -rf $T && mkdir -p $T
cp -c -R /Users/muhamadrifaldi/Library/Caches/retrux-lanes/aa3_judged/retrux-web $T/retrux-web
cd $T && patch -p1 --dry-run < $W/aa5a.patch > /dev/null && patch -p1 < $W/aa5a.patch && echo APPLIED
diff -r -x node_modules -x dist -x .next -x '*.tsbuildinfo' -x next-env.d.ts $T/retrux-web /Users/muhamadrifaldi/Library/Caches/retrux-lanes/aa5a/retrux-web && echo "IDENTICAL to LANE (sources)"
find $T/retrux-web -name "*.orig" -o -name "*.rej" | head
rm -rf $T
