#!/bin/zsh
# AA8 integrator batch A: the integrated build (:5199 = AA7 + polish; tip NOT applied, its ok was false) - ?fftip=0 == default
# (= the polish-only state), and the knee-0.6 (glide) switches vs AA7 (:5197) with the knee set live to 0.6 before the settle
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/integ; T=$W/tools; I=$W/ident; t0=$(date +%s)
run() { node $T/fx/identS.mjs "$@" > /dev/null 2>> $W/logs/ident.err; echo "$(date +%T) done $*"; }
PRE="window.__hero.pipeline.aa.read.uAAKnee.value = 0.6"
run --port 5199 --out $I/i8_def.json
run --port 5199 --qs "fftip=0" --out $I/i8_fftip0.json
for v in "def|" "f0|ffblock=0" "mc0|mirrorcost=0" "mr0|mrows=0" "sf0|slabflash=0"; do n=${v%%|*}; q=${v#*|}
  [[ $n != def ]] && run --port 5199 ${q:+--qs} ${q:+$q} --out $I/i8_$n.json
  run --port 5197 ${q:+--qs} ${q:+$q} --pre "$PRE" --out $I/a7k_$n.json
done
run --port 5199 --scale 0.7 --out $I/i8_s07.json
run --port 5197 --scale 0.7 --pre "$PRE" --out $I/a7k_s07.json
run --port 5199 --nodebug --out $I/i8_nodbg.json
run --port 5197 --nodebug --pre "$PRE" --out $I/a7k_nodbg.json
echo "i_A $(( $(date +%s) - t0 ))s"
