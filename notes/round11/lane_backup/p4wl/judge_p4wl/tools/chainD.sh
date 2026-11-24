#!/bin/zsh
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4wl
until [ -f fair/DONE ] && [ -f caps/S60DONE ] && [ -f poses/DONE ]; do sleep 5; done
STRICT=1 SLOT_BG=0 MODE=rest node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/slot/slot.mjs run 'judge_p4wl:perf-rest' -- node tools/perfab.mjs perf/rest.json 6 "http://localhost:5162/?tier=T1" "http://localhost:5163/?tier=T1" 6 9 > perf/rest.txt 2>&1
node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/slot/slot.mjs run 'judge_p4wl:perf-T0' -- zsh -c "cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4wl; for i in 1 2 3; do for p in 5162:main 5163:lane; do node tools/rl.mjs --nocap 1 --frames 300 --warm 8000 --vw 414 --vh 720 --phone 1 --dpr 2 --url http://localhost:\${p%%:*}/ --qs tier=T0 --out perf/t0_\${p#*:}_\$i | tail -1; done; done" > perf/t0.txt 2>&1
echo PERFDONE > perf/DONE
