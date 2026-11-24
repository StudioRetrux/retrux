#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
J=$SP/work_p4/judge_p4wl; R=$SP/work_p4/rejudge_p4wl; S=$SP/slot/slot.mjs
until grep -q DONE_M $R/fair/run.log 2>/dev/null && grep -q DONE_L $R/fair/run.log 2>/dev/null && grep -q RLDONE $R/rl/run.log 2>/dev/null; do sleep 5; done
cd $J
STRICT=1 SLOT_BG=0 MODE= node $S run 'rejudge_p4wl:perf-sweep' -- node tools/perfab.mjs $R/perf/sweep.json 6 "http://localhost:5162/?tier=T1" "http://localhost:5163/?tier=T1" 6 8 > $R/perf/sweep.txt 2>&1
node $S run 'rejudge_p4wl:perf-T0' -- zsh -c "cd $J; for i in 1 2; do for p in 5162:main 5163:lane; do node tools/rl.mjs --nocap 1 --frames 300 --warm 8000 --vw 414 --vh 720 --phone 1 --dpr 2 --url http://localhost:\${p%%:*}/ --qs tier=T0 --out $R/perf/t0_\${p#*:}_\$i | tail -1; done; done" > $R/perf/t0.txt 2>&1
echo PERFDONE > $R/perf/DONE
