#!/bin/zsh
# judge_p4hold batch C2: memory (+ after a restore), live context restore
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4hold
cd $J
node tools/memprobe2.mjs 'main=5199' 'lane=5178' 'lanekeep=5178?panokeep=1' > ana/mem.txt 2>&1
node tools/ctxlive.mjs --outdir caps/ctxlive 'lane=5178' 'main=5199' 'lanerun0=5178?ctxrun=0' 'laneoff=5178?p4hold=0' > ana/ctxlive.txt 2>&1
echo C2 done
