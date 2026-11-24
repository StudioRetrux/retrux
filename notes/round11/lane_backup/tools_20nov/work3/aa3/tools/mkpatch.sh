#!/bin/zsh
# aa3.patch = LANE vs BASE (paths a/retrux-web/... b/retrux-web/...), then mirror patch + LOG to MAIN's backup folder.
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3
B=/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/notes/round11/lane_backup/aa3
cd /Users/muhamadrifaldi/Library/Caches/retrux-lanes
diff -ruN -x node_modules -x dist -x .next -x '*.tsbuildinfo' -x next-env.d.ts aa3_base/retrux-web aa3/retrux-web \
  | sed -e 's#^--- aa3_base/retrux-web/#--- a/retrux-web/#' -e 's#^+++ aa3/retrux-web/#+++ b/retrux-web/#' \
        -e 's#^diff -ruN .* aa3_base/retrux-web/\([^ ]*\) aa3/retrux-web/.*#diff -ruN a/retrux-web/\1 b/retrux-web/\1#' > $W/aa3.patch
mkdir -p $B
cp $W/aa3.patch $B/aa3.patch
cp $W/LOG.md $B/LOG.md
echo "patch: $(grep -c '^+++ ' $W/aa3.patch) files, $(wc -l < $W/aa3.patch) lines -> $B"
