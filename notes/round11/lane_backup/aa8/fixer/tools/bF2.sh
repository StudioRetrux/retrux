#!/bin/zsh
# AA8 fixer batch F2 (POST-fix build, :5199 rebuilt 00:23:23): AJ-2 ctxstep default / lktaa=0 / envlake=plate, loss 1 / 0;
# then identS part 1 (integrator's i_A set on :5199 only; compared with the integrator's saved I8 hashes)
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/fixer; T=$W/tools; I=$W/ident; t0=$(date +%s)
cd $W
for q in "" "lktaa=0" "envlake=plate"; do n=${q:-def}; n=${n//=/}
  for L in 1 0; do node $T/pf/ctxstep.mjs --port 5199 --qs "$q" --loss $L --out ctx/fix_${n}_L$L > ctx/fix_${n}_L$L.json 2> logs/ctx_fix_${n}_L$L.err; done
  echo "$(date +%T) ctx $n $(( $(date +%s) - t0 ))s"
done
run() { node $T/fx/identS.mjs "$@" > /dev/null 2>> $W/logs/ident.err; echo "$(date +%T) done $*"; }
run --port 5199 --out $I/f8_def.json
run --port 5199 --qs "fftip=0" --out $I/f8_fftip0.json
for v in "f0|ffblock=0" "mc0|mirrorcost=0" "mr0|mrows=0" "sf0|slabflash=0"; do n=${v%%|*}; q=${v#*|}; run --port 5199 --qs "$q" --out $I/f8_$n.json; done
run --port 5199 --scale 0.7 --out $I/f8_s07.json
run --port 5199 --nodebug --out $I/f8_nodbg.json
echo "F2 $(( $(date +%s) - t0 ))s"
