#!/bin/zsh
# AA8 recheck batch R3b (FINAL build :5199): identS part 2 (the remaining switches of the integrator's / fixer's set)
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/recheck; T=$W/tools/f; I=$W/ident; t0=$(date +%s)
run() { node $T/fx/identS.mjs "$@" > /dev/null 2>> $W/logs/ident.err; echo "$(date +%T) done $*"; }
A5="aaresolve=0&slabflash=0&lktaa=0&lkglide=0&ffblock=0"; FL="ffbd0=0&ffbd1=0.01&ffbl=1"
for v in "f0|ffblock=0" "mc0|mirrorcost=0" "mr0|mrows=0" "sf0|slabflash=0" "ar0|aaresolve=0" "all5|$A5" "ffblab|$FL"; do n=${v%%|*}; q=${v#*|}; run --port 5199 --qs "$q" --out $I/r8_$n.json; done
run --port 5199 --scale 0.7 --out $I/r8_s07.json
run --port 5199 --nodebug --out $I/r8_nodbg.json
run --port 5199 --nodebug --qs "$FL" --out $I/r8_nodbg_ffblab.json
echo "R3b $(( $(date +%s) - t0 ))s"
