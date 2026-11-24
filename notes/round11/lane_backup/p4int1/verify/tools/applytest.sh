#!/bin/zsh
# verify_int1 apply test: fresh cp -c -R clone of aa8 (in my WORK), patch -p1, + asset; == int1 app/ public/; tsc; bundle == :5173's served bundle
V=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/verify_int1
L=/Users/muhamadrifaldi/RetruxR11Work/lanes
MAINP=/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/notes/round11/lane_backup/p4int1/int1_vs_main.patch
C=$V/apply/clone
rm -rf $C; cp -c -R $L/aa8 $C; rm -f $C/retrux-web/log
echo "patch used: $MAINP sha256 $(shasum -a 256 $MAINP | cut -c1-16)"
cd $C
patch -p1 --dry-run < $MAINP > $V/apply/dry.txt; echo "dry run rc=$?"
patch -p1 < $MAINP > $V/apply/apply.txt; echo "apply rc=$? ($(grep -c '^patching file' $V/apply/apply.txt) files; fuzz/offset lines: $(grep -ciE 'fuzz|offset' $V/apply/apply.txt))"
echo "orig/rej: $(find $C -path '*/node_modules' -prune -o \( -name '*.orig' -o -name '*.rej' \) -print | wc -l | tr -d ' ')"
cp $L/p4env/retrux-web/public/hero/baked/Object_2_010_p4.webp $C/retrux-web/public/hero/baked/
diff -r $C/retrux-web/app $L/int1/retrux-web/app && echo "applied app/ == int1 app/"
diff -r $C/retrux-web/public $L/int1/retrux-web/public && echo "applied public/ (+ asset from the env lane) == int1 public/"
diff -r $C/retrux-web/hero-lab/main.ts $L/int1/retrux-web/hero-lab/main.ts && diff -r $C/retrux-web/hero-lab/index.html $L/int1/retrux-web/hero-lab/index.html && echo "hero-lab main.ts/index.html same"
cd $C/retrux-web
npx tsc -p tsconfig.hero.json --noEmit > $V/apply/tsc_hero.txt 2>&1; echo "tsc hero (clone) rc=$? lines=$(wc -l < $V/apply/tsc_hero.txt | tr -d ' ')"
npx tsc -p tsconfig.json --noEmit --incremental false > $V/apply/tsc_proj.txt 2>&1; echo "tsc project (clone) rc=$? lines=$(wc -l < $V/apply/tsc_proj.txt | tr -d ' ')"
node $V/tools/buildlab.mjs $C/retrux-web $V/apply/dist_clone
curl -s http://localhost:5173/ -o $V/apply/served_index.html
JS=$(grep -oE 'src="[^"]+\.js"' $V/apply/served_index.html | head -1 | sed 's/src="//;s/"//'); echo "served script: $JS"
curl -s "http://localhost:5173/${JS#/}" -o $V/apply/served_main.js
echo "served main.js sha256 $(shasum -a 256 $V/apply/served_main.js | cut -c1-16)  clone build main.js sha256 $(shasum -a 256 $V/apply/dist_clone/main.js | cut -c1-16)  int1 dist main.js $(shasum -a 256 $L/int1/retrux-web/hero-lab/dist/main.js | cut -c1-16)"
cmp $V/apply/served_main.js $V/apply/dist_clone/main.js && echo "clone bundle == served :5173 bundle (byte for byte)"
cd /; rm -rf $C; echo "clone removed"
