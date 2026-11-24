#!/bin/zsh
# AA8 recheck: G8 identity. Fresh identS sessions on the FINAL build (r8_*) vs (1) the fixer's final-build sessions (f8_*), (2) the
# integrator's pre-fix sessions (i8_*), (3) the binding references the integrator recorded fresh tonight (AA6 :5196, BASE :5182, AA7 :5197)
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/recheck; I=$W/ident; FI=$SP/work8/fixer/ident; II=$SP/work8/integ/ident
c() { [[ -f $1 && -f $2 ]] && node $W/tools/f/fx/identcmp.mjs $1 $2 "$3" || echo "MISSING $3 ($1 / $2)"; }
echo "# 1. recheck (R8) vs fixer final (F8) and integrator (I8), same switch"
for n in def g0mc0 all6t t2all6t plate t0 fftip0 g0 lktaa0 f0 mc0 mr0 sf0 ar0 all5 ffblab s07 nodbg nodbg_ffblab; do [[ -f $I/r8_$n.json ]] || continue; c $I/r8_$n.json $FI/f8_$n.json "R8 $n vs F8 $n"; c $I/r8_$n.json $II/i8_$n.json "R8 $n vs I8 $n"; done
echo "# 2. binding G8 / G9"
c $I/r8_g0mc0.json $II/a6_g0.json "R8 lkglide=0&mirrorcost=0 vs AA6 lkglide=0 (:5196)"
c $I/r8_all6t.json $II/b_t1.json "R8 all six off + fftip=0 vs BASE T1 (:5182)"
c $I/r8_t2all6t.json $II/b_t2.json "R8 T2 all six off + fftip=0 vs BASE T2"
c $I/r8_plate.json $II/b_plate.json "R8 envlake=plate vs BASE plate"
c $I/r8_t0.json $II/b_t0.json "R8 T0 phone vs BASE T0"
c $I/r8_fftip0.json $I/r8_def.json "R8 fftip=0 vs R8 default"
echo "# 3. knee-0.5 / unused switches vs AA7 :5197; knee-0.6 switches vs AA7 + K0.6 live"
for n in g0 lktaa0 ar0 all5; do [[ -f $I/r8_$n.json ]] && c $I/r8_$n.json $II/a7_$n.json "R8 $n vs AA7 $n"; done
for n in def f0 mc0 mr0 sf0 s07 nodbg ffblab nodbg_ffblab; do [[ -f $I/r8_$n.json ]] && c $I/r8_$n.json $II/a7k_$n.json "R8 $n vs AA7 $n + K0.6"; done
echo "# 4. P-4: lab params with ?debug differ from ?debug alone (live); without ?debug identical (ignored)"
[[ -f $I/r8_ffblab.json ]] && c $I/r8_ffblab.json $I/r8_def.json "R8 ffblab (debug) vs R8 default (debug)"
[[ -f $I/r8_nodbg_ffblab.json ]] && c $I/r8_nodbg_ffblab.json $I/r8_nodbg.json "R8 nodebug+ffblab vs R8 nodebug"
echo "# console errors / warnings per session"
n=0; m=0; for f in $I/r8_*.json; do n=$((n+1)); node -e 'const o=JSON.parse(require("fs").readFileSync(process.argv[1]));if((o.logs||[]).length){console.log(process.argv[1].split("/").pop(),JSON.stringify(o.logs));process.exit(3)}' $f || m=$((m+1)); done; echo "sessions: $n, with console lines: $m"
