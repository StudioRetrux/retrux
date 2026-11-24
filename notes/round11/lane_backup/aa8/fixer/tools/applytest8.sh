#!/bin/bash
# AA8 fixer: apply-test both patches with patch -p1 on fresh cp -c -R clones (aa7 -> aa8_vs_aa7.patch, aa3_base -> aa8.patch)
L=/Users/muhamadrifaldi/Library/Caches/retrux-lanes; W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/fixer
for pr in "aa7 aa8_vs_aa7.patch aa8f_apply7" "aa3_base aa8.patch aa8f_applyB"; do set -- $pr; SRC=$1; PATCH=$W/$2; C=$L/$3
  echo "== $2 on a fresh clone of $SRC ($C)"
  rm -rf $C; t0=$(date +%s); cp -c -R $L/$SRC $C; echo "   clone $(( $(date +%s) - t0 ))s"
  ( cd $C && patch -p1 --dry-run < $PATCH > $W/logs/apply_dry_$3.log 2>&1; echo "   dry-run rc $?"; patch -p1 < $PATCH > $W/logs/apply_$3.log 2>&1; echo "   apply rc $?" )
  sed 's/^/   | /' $W/logs/apply_$3.log
  echo "   .orig / .rej in the clone: $(find $C -path '*/node_modules' -prune -o \( -name '*.orig' -o -name '*.rej' \) -print | wc -l | tr -d ' ')"
  diff -rq $C/retrux-web/app $L/aa8/retrux-web/app > /dev/null && echo "   applied app/ == lane aa8 app/ (diff -rq: IDENTICAL)" || { echo "   applied app/ DIFFERS from lane aa8:"; diff -rq $C/retrux-web/app $L/aa8/retrux-web/app; }
  m0=$(stat -f '%m %z' $C/retrux-web/tsconfig.tsbuildinfo)
  ( cd $C/retrux-web && npx tsc -p tsconfig.hero.json --noEmit > $W/logs/tsc_$3_hero.log 2>&1; e1=$?; npx tsc -p tsconfig.json --noEmit --incremental false > $W/logs/tsc_$3_proj.log 2>&1; e2=$?; echo "   clone tsc: hero rc $e1 ($(wc -l < $W/logs/tsc_$3_hero.log | tr -d ' ') lines), project rc $e2 ($(wc -l < $W/logs/tsc_$3_proj.log | tr -d ' ') lines)" )
  echo "   clone tsbuildinfo before/after: $m0 / $(stat -f '%m %z' $C/retrux-web/tsconfig.tsbuildinfo)"
done
