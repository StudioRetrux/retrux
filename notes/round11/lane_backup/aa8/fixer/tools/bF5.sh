#!/bin/zsh
# AA8 fixer batch F5 (FINAL build): identS on :5199 for every switch of the integrator's set, part 1
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/fixer; T=$W/tools; I=$W/ident; t0=$(date +%s)
run() { node $T/fx/identS.mjs "$@" > /dev/null 2>> $W/logs/ident.err; echo "$(date +%T) done $*"; }
run --port 5199 --out $I/f8_def.json
run --port 5199 --qs "fftip=0" --out $I/f8_fftip0.json
for v in "f0|ffblock=0" "mc0|mirrorcost=0" "mr0|mrows=0" "sf0|slabflash=0"; do n=${v%%|*}; q=${v#*|}; run --port 5199 --qs "$q" --out $I/f8_$n.json; done
run --port 5199 --scale 0.7 --out $I/f8_s07.json
run --port 5199 --nodebug --out $I/f8_nodbg.json
run --port 5199 --qs "lkglide=0&mirrorcost=0" --out $I/f8_g0mc0.json
run --port 5199 --qs "lkglide=0" --out $I/f8_g0.json
echo "F5 $(( $(date +%s) - t0 ))s"
