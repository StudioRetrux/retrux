#!/bin/zsh
# AA8 fixer: identS comparisons on the FINAL build (:5199, 00:28:17): every switch vs the integrator's same-switch session (I8,
# the build before the fix: must be IDENTICAL in the final image, every target and every program), then the binding G8 / G9 pairs
# against the integrator's saved AA7 (+ knee 0.6 live) / AA6 / BASE sessions (deterministic, fresh tonight)
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/fixer; I=$W/ident; II=$SP/work8/integ/ident
c() { node $W/tools/fx/identcmp.mjs $1 $2 "$3"; }
echo "# 1. FINAL (fixer) vs I8 (integrator's build), same switch"
for n in def fftip0 f0 mc0 mr0 sf0 s07 nodbg g0mc0 g0 all5 lktaa0 ar0 ffblab nodbg_ffblab all6t t2all6t plate t0; do c $I/f8_$n.json $II/i8_$n.json "F8 $n vs I8 $n"; done
echo "# 2. knee 0.6 switches vs AA7 :5197 + knee 0.6 live (integrator's sessions)"
for n in def f0 mc0 mr0 sf0 s07 nodbg ffblab nodbg_ffblab; do c $I/f8_$n.json $II/a7k_$n.json "F8 $n vs AA7 $n + K0.6"; done
echo "# 3. knee 0.5 / unused vs AA7 :5197"
for n in g0 all5 lktaa0 ar0; do c $I/f8_$n.json $II/a7_$n.json "F8 $n vs AA7 $n"; done
echo "# 4. binding G8 / G9"
c $I/f8_g0mc0.json $II/a6_g0.json "F8 lkglide=0&mirrorcost=0 vs AA6 lkglide=0"
c $I/f8_all6t.json $II/b_t1.json "F8 all six off + fftip=0 vs BASE T1"
c $I/f8_t2all6t.json $II/b_t2.json "F8 T2 all six off + fftip=0 vs BASE T2"
c $I/f8_plate.json $II/b_plate.json "F8 envlake=plate vs BASE plate"
c $I/f8_t0.json $II/b_t0.json "F8 T0 phone vs BASE T0"
c $I/f8_fftip0.json $I/f8_def.json "F8 fftip=0 vs F8 default"
echo "# console errors / warnings per session"
n=0; m=0; for f in $I/f8_*.json; do n=$((n+1)); node -e 'const o=JSON.parse(require("fs").readFileSync(process.argv[1]));if((o.logs||[]).length){console.log(process.argv[1].split("/").pop(),JSON.stringify(o.logs));process.exit(3)}' $f || m=$((m+1)); done; echo "sessions: $n, with console lines: $m"
