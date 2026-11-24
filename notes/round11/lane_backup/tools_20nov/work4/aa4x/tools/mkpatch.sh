#!/bin/zsh
# aa4x.patch = my lane vs the frozen AA3 copy (aa3_judged); aa4x_vs_base.patch = my lane vs BASE; mirror patch + LOG to MAIN backup.
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work4/aa4x
B=/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/notes/round11/lane_backup/aa4x
cd /Users/muhamadrifaldi/Library/Caches/retrux-lanes
mk() { diff -ruN -x node_modules -x dist -x .next -x '*.tsbuildinfo' -x next-env.d.ts $1/retrux-web aa4x/retrux-web \
  | sed -e "s#^--- $1/retrux-web/#--- a/retrux-web/#" -e 's#^+++ aa4x/retrux-web/#+++ b/retrux-web/#' \
        -e "s#^diff -ruN .* $1/retrux-web/\([^ ]*\) aa4x/retrux-web/.*#diff -ruN a/retrux-web/\1 b/retrux-web/\1#"; }
mk aa3_judged > $W/aa4x.patch
mk aa3_base > $W/aa4x_vs_base.patch
mkdir -p $B
cp $W/aa4x.patch $W/aa4x_vs_base.patch $W/LOG.md $B/
echo "patch: $(grep -c '^+++ ' $W/aa4x.patch) files, $(wc -l < $W/aa4x.patch) lines -> $B"
