#!/bin/zsh
# apply test: fresh clone of int1's retrux-web/app + public, patch -p1, compare with the lane
LANES=/Users/muhamadrifaldi/RetruxR11Work/lanes
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4atmos
T=$W/applytest; rm -rf $T; mkdir -p $T/retrux-web
cp -c -R $LANES/int1/retrux-web/app $T/retrux-web/app
cd $T && patch -p1 --dry-run < $W/p4atmos_vs_int1.patch > /dev/null && echo "dry run rc 0" && patch -p1 < $W/p4atmos_vs_int1.patch > /dev/null && echo "apply rc 0"
find $T -name "*.orig" -o -name "*.rej" | wc -l | xargs echo "orig/rej files:"
diff -r $T/retrux-web/app $LANES/p4atmos/retrux-web/app && echo "app/ == lane app/"
rm -rf $T
