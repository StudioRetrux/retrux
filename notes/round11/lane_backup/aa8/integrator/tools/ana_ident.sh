#!/bin/zsh
# AA8 integrator: identS comparisons (final image + mirror / walk / cache / cacheN / reflection + every linked program)
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/integ; I=$W/ident; PO=$SP/work8/polish/ident; RC=$SP/work7/recheck/ident
c() { node $W/tools/fx/identcmp.mjs $1 $2 "$3"; }
echo "# 1. ?fftip=0 == the polish-only state (the tip patch is NOT integrated: its ok was false; nothing reads ?fftip)"
c $I/i8_fftip0.json $I/i8_def.json "I8 fftip=0 vs I8 default"
c $I/i8_def.json $PO/fd_def.json "I8 default vs POLISH final default (23:02)"
c $I/i8_fftip0.json $PO/fd_def.json "I8 fftip=0 vs POLISH final default"
echo "# 2. knee 0.6 (glide) switches: I8 vs AA7 :5197 with the knee set live to 0.6 before the settle (fresh runs)"
for n in def f0 mc0 mr0 sf0 s07 nodbg; do c $I/i8_$n.json $I/a7k_$n.json "I8 $n vs AA7 $n + K0.6 live"; done
echo "# 3. knee 0.5 / unused: I8 vs AA7 :5197 (fresh runs)"
for n in g0 all5 lktaa0 ar0; do c $I/i8_$n.json $I/a7_$n.json "I8 $n vs AA7 $n"; done
echo "# 4. P-4: the AA5b lab params (ffbd0=0&ffbd1=0.01&ffbl=1)"
c $I/i8_ffblab.json $I/a7k_ffblab.json "?debug + params: I8 vs AA7 + K0.6 live"
c $I/i8_ffblab.json $I/i8_def.json "?debug + params vs ?debug alone (I8; live)"
c $I/i8_nodbg_ffblab.json $I/i8_nodbg.json "no ?debug + params vs no ?debug (I8)"
c $I/a7k_nodbg_ffblab.json $I/a7k_nodbg.json "no ?debug + params vs no ?debug (AA7)"
echo "# 5. binding G8 / G9 (fresh :5196 / :5182 runs; BASE with its plain URL)"
c $I/i8_g0mc0.json $I/a6_g0.json "I8 lkglide=0&mirrorcost=0 vs AA6 lkglide=0"
c $I/i8_all6t.json $I/b_t1.json "I8 all six off + fftip=0 vs BASE T1"
c $I/i8_t2all6t.json $I/b_t2.json "I8 T2 all six off + fftip=0 vs BASE T2"
c $I/i8_plate.json $I/b_plate.json "I8 envlake=plate vs BASE plate"
c $I/i8_t0.json $I/b_t0.json "I8 T0 phone vs BASE T0"
echo "# 6. cross-checks against saved hashes (the AA7 recheck's runs; deterministic)"
c $I/i8_def.json $RC/r5197_def.json "I8 default vs AA7 default (recheck; expect final only)"
c $I/b_t1.json $RC/r5182_def.json "BASE T1 fresh vs BASE T1 (recheck)"
c $I/a6_g0.json $RC/r5196_g0.json "AA6 lkglide=0 fresh vs AA6 (recheck)"
echo "# console errors / warnings per session (identS logs)"
for f in $I/*.json; do node -e 'const o=JSON.parse(require("fs").readFileSync(process.argv[1]));if((o.logs||[]).length)console.log(process.argv[1].split("/").pop(),JSON.stringify(o.logs))' $f; done
echo "sessions: $(ls $I/*.json | wc -l | tr -d ' '), with logs: $(for f in $I/*.json; do node -e 'const o=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(((o.logs||[]).length?1:0)+"\n")' $f; done | grep -c 1)"
