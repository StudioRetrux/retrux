#!/bin/zsh
# aa4y.patch = MY lane vs the frozen AA3 (aa3_judged), then mirror patch + LOG to MAIN's backup folder.
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work4/aa4y
B=/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/notes/round11/lane_backup/aa4y
cd /Users/muhamadrifaldi/Library/Caches/retrux-lanes
diff -ruN -x node_modules -x dist -x .next -x '*.tsbuildinfo' -x next-env.d.ts aa3_judged/retrux-web aa4y/retrux-web \
  | sed -e 's#^--- aa3_judged/retrux-web/#--- a/retrux-web/#' -e 's#^+++ aa4y/retrux-web/#+++ b/retrux-web/#' \
        -e 's#^diff -ruN .* aa3_judged/retrux-web/\([^ ]*\) aa4y/retrux-web/.*#diff -ruN a/retrux-web/\1 b/retrux-web/\1#' > $W/aa4y.patch
mkdir -p $B
cp $W/aa4y.patch $B/aa4y.patch
cp $W/LOG.md $B/LOG.md 2>/dev/null
echo "patch: $(grep -c '^+++ ' $W/aa4y.patch) files, $(wc -l < $W/aa4y.patch) lines -> $B"
