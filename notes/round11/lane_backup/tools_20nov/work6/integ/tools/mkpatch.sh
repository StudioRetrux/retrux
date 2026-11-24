#!/bin/zsh
# aa6.patch = AA6 lane vs BASE (aa3_base); aa6_vs_fixed1.patch = AA6 lane vs aa3_fixed1. Paths a/retrux-web/... b/retrux-web/...
# (apply with `patch -p1` from the folder that holds retrux-web), as aa3.patch.
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/integ
cd /Users/muhamadrifaldi/Library/Caches/retrux-lanes
mk() {  # $1 = reference lane, $2 = out
  diff -ruN -x node_modules -x dist -x .next -x '*.tsbuildinfo' -x next-env.d.ts $1/retrux-web aa6/retrux-web \
    | sed -e "s#^--- $1/retrux-web/#--- a/retrux-web/#" -e 's#^+++ aa6/retrux-web/#+++ b/retrux-web/#' \
          -e "s#^diff -ruN .* $1/retrux-web/\([^ ]*\) aa6/retrux-web/.*#diff -ruN a/retrux-web/\1 b/retrux-web/\1#" > $2
  echo "$2: $(grep -c '^+++ ' $2) files ($(grep '^+++ ' $2 | sed 's#^+++ b/retrux-web/##; s#\t.*##' | tr '\n' ' ')), $(wc -l < $2) lines"
}
mk aa3_base $W/aa6.patch
mk aa3_fixed1 $W/aa6_vs_fixed1.patch
