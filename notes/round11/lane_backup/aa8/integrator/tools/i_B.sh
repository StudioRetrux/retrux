#!/bin/zsh
# AA8 integrator batch B: switches where the knee stays 0.5 / is unused vs AA7 (:5197); G8 ?lkglide=0&mirrorcost=0 vs AA6 ?lkglide=0
# (:5196, fresh); P-4: the ffb* lab params with ?debug (live in the lab: vs AA7 + live 0.6) and WITHOUT ?debug (must be ignored)
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/integ; T=$W/tools; I=$W/ident; t0=$(date +%s)
run() { node $T/fx/identS.mjs "$@" > /dev/null 2>> $W/logs/ident.err; echo "$(date +%T) done $*"; }
PRE="window.__hero.pipeline.aa.read.uAAKnee.value = 0.6"
A5="aaresolve=0&slabflash=0&lktaa=0&lkglide=0&ffblock=0"; FL="ffbd0=0&ffbd1=0.01&ffbl=1"
run --port 5199 --qs "lkglide=0&mirrorcost=0" --out $I/i8_g0mc0.json
run --port 5196 --qs "lkglide=0" --out $I/a6_g0.json
for v in "g0|lkglide=0" "all5|$A5" "lktaa0|lktaa=0" "ar0|aaresolve=0"; do n=${v%%|*}; q=${v#*|}
  run --port 5199 --qs "$q" --out $I/i8_$n.json
  run --port 5197 --qs "$q" --out $I/a7_$n.json
done
run --port 5199 --qs "$FL" --out $I/i8_ffblab.json
run --port 5197 --qs "$FL" --pre "$PRE" --out $I/a7k_ffblab.json
run --port 5199 --nodebug --qs "$FL" --out $I/i8_nodbg_ffblab.json
run --port 5197 --nodebug --qs "$FL" --pre "$PRE" --out $I/a7k_nodbg_ffblab.json
echo "i_B $(( $(date +%s) - t0 ))s"
