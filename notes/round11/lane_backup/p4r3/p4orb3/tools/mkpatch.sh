#!/bin/zsh
# p4orb3 patch vs int1: diff -u per changed file (app/ and public/), labels a/retrux-web/<f> b/retrux-web/<f>
L=/Users/muhamadrifaldi/RetruxR11Work/lanes
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4orb3
P=$W/p4orb3_vs_int1.patch; : > $P
cd $L/p4orb3/retrux-web
for f in $(diff -rq $L/int1/retrux-web/app app | awk '/differ/{print $4} /Only in app/{print}' | sed -E 's|^Only in ([^:]+): (.*)$|\1/\2|' | sed "s|^$L/p4orb3/retrux-web/||"); do
  f=${f#./}
  if [ -f "$L/int1/retrux-web/$f" ]; then diff -u --label a/retrux-web/$f --label b/retrux-web/$f $L/int1/retrux-web/$f $f >> $P
  else diff -u --label a/retrux-web/$f --label b/retrux-web/$f /dev/null $f >> $P; fi
done
diff -rq $L/int1/retrux-web/public public && echo "public/ unchanged"
echo "files:"; grep '^+++ ' $P; wc -l $P; shasum -a 256 $P
