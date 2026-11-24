#!/bin/zsh
# aa5a.patch = my lane vs aa3_judged (paths a/retrux-web/... b/retrux-web/...); mirror patch + LOG + tools + key images to MAIN backup.
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a
B=/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/notes/round11/lane_backup/aa5a
cd /Users/muhamadrifaldi/Library/Caches/retrux-lanes
diff -ruN -x node_modules -x dist -x .next -x '*.tsbuildinfo' -x next-env.d.ts aa3_judged/retrux-web aa5a/retrux-web \
  | sed -e 's#^--- aa3_judged/retrux-web/#--- a/retrux-web/#' -e 's#^+++ aa5a/retrux-web/#+++ b/retrux-web/#' \
        -e 's#^diff -ruN .* aa3_judged/retrux-web/\([^ ]*\) aa5a/retrux-web/.*#diff -ruN a/retrux-web/\1 b/retrux-web/\1#' > $W/aa5a.patch
mkdir -p $B/tools $B/img $B/ana
cp $W/aa5a.patch $B/aa5a.patch
cp $W/LOG.md $B/LOG.md
cp $W/tools/*.mjs $W/tools/*.sh $B/tools/ 2>/dev/null
cp $W/img/*.png $B/img/ 2>/dev/null; mkdir -p $B/img/final $B/img/ghost; cp $W/img/final/*.png $B/img/final/ 2>/dev/null; cp $W/img/ghost/*.png $B/img/ghost/ 2>/dev/null; for f in $W/ana/*.json; do case $(basename $f) in dump_*) ;; *) cp $f $B/ana/;; esac; done
cp $W/ana/*.txt $B/ana/ 2>/dev/null
echo "patch: $(grep -c '^+++ ' $W/aa5a.patch) files, $(wc -l < $W/aa5a.patch) lines -> $B"
