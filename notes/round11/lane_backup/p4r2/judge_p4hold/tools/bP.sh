#!/bin/zsh
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4hold
cd $J
MODE=hold node tools/perfab.mjs perf/ab_hold.json 6 'http://localhost:5199/?tier=T1' 'http://localhost:5178/?tier=T1' 6 > perf/ab_hold.txt 2>&1
echo P done
