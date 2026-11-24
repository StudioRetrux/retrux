#!/bin/zsh
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4hold
cd $J
node tools/memprobe2.mjs 'lanekeep=5178?panokeep=1' 'lane2=5178' > ana/mem2.txt 2>&1
node tools/ctxlive.mjs --outdir caps/ctxlive 'lanerun0=5178?ctxrun=0' > ana/ctxlive_run0.txt 2>&1
node tools/ctxlive.mjs --outdir caps/ctxlive 'laneoff=5178?p4hold=0' > ana/ctxlive_off.txt 2>&1
node tools/ctxlive.mjs --outdir caps/ctxlive 'lanekeep=5178?panokeep=1' > ana/ctxlive_keep.txt 2>&1
echo C3 done
