#!/bin/bash
# AA5b patch vs aa3_judged (retrux-web relative paths, apply with `patch -p1` inside retrux-web); lab debug lines (AA5BDBG) stripped.
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5b
B=/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/notes/round11/lane_backup/aa5b
J=/Users/muhamadrifaldi/Library/Caches/retrux-lanes/aa3_judged/retrux-web
L=/Users/muhamadrifaldi/Library/Caches/retrux-lanes/aa5b/retrux-web
T=$W/patchsrc; rm -rf $T; mkdir -p $T
out=$W/aa5b.patch; : > $out
for f in $(cd $L && diff -rq -x node_modules -x dist -x .next -x '*.tsbuildinfo' -x next-env.d.ts $J $L | sed -n 's#^Files '"$J"'/\(.*\) and .* differ$#\1#p'); do
  mkdir -p $T/$(dirname $f); grep -v "AA5BDBG" $L/$f > $T/$f
  diff -u --label a/$f --label b/$f $J/$f $T/$f >> $out
done
grep -c "" $out; cp $out $B/aa5b.patch; cp $W/LOG.md $B/LOG.md 2>/dev/null; echo "mirrored to $B"
