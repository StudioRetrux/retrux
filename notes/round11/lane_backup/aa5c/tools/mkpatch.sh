#!/bin/zsh
# aa5c.patch = LANE vs aa3_fixed1 (paths a/retrux-web/... b/retrux-web/...), then mirror patch + LOG to MAIN's backup folder.
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5c
B=/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/notes/round11/lane_backup/aa5c
cd /Users/muhamadrifaldi/Library/Caches/retrux-lanes
diff -ruN -x node_modules -x dist -x .next -x '*.tsbuildinfo' -x next-env.d.ts aa3_fixed1/retrux-web aa5c/retrux-web \
  | sed -e 's#^--- aa3_fixed1/retrux-web/#--- a/retrux-web/#' -e 's#^+++ aa5c/retrux-web/#+++ b/retrux-web/#' \
        -e 's#^diff -ruN .* aa3_fixed1/retrux-web/\([^ ]*\) aa5c/retrux-web/.*#diff -ruN a/retrux-web/\1 b/retrux-web/\1#' > $W/aa5c.patch
mkdir -p $B
cp $W/aa5c.patch $B/aa5c.patch
cp $W/LOG.md $B/LOG.md
echo "patch: $(grep -c '^+++ ' $W/aa5c.patch) files, $(wc -l < $W/aa5c.patch) lines -> $B"
