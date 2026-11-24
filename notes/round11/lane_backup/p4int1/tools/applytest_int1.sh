#!/bin/zsh
# apply test: fresh cp -c -R clone of aa8, patch -p1 from the clone root, + the binary asset, == int1 app/ and public/, tsc 0 / 0
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/int1
L=/Users/muhamadrifaldi/RetruxR11Work/lanes
C=$L/int1_apply
rm -rf $C; cp -c -R $L/aa8 $C; rm -f $C/retrux-web/log
cd $C
patch -p1 --dry-run < $W/int1_vs_main.patch > /dev/null; echo "dry run rc=$?"
patch -p1 < $W/int1_vs_main.patch; echo "apply rc=$?"
echo "orig/rej: $(find $C -name '*.orig' -o -name '*.rej' | grep -v node_modules | wc -l | tr -d ' ')"
cp $L/int1/retrux-web/public/hero/baked/Object_2_010_p4.webp $C/retrux-web/public/hero/baked/
diff -r $C/retrux-web/app $L/int1/retrux-web/app && echo "applied app/ == int1 app/"
diff -r $C/retrux-web/public $L/int1/retrux-web/public && echo "applied public/ (+ asset) == int1 public/"
cd $C/retrux-web
npx tsc -p tsconfig.hero.json --noEmit; echo "tsc hero rc=$?"
npx tsc -p tsconfig.json --noEmit --incremental false; echo "tsc project rc=$?"
cd /; rm -rf $C; echo "clone removed"
