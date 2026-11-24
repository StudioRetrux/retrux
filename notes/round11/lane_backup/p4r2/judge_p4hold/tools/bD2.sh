#!/bin/zsh
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4hold
cd $J
{
echo "== LANE 1280x800 t=0.9"; VW=1280 VH=800 LAB=http://localhost:5178 node tools/probe_holdboundsV.mjs 0.5 0.9 | grep WORST
for nm in MAIN:5199 LANE:5178; do for t in 0.9 2.97; do echo "== ${nm%%:*} 2560x1080 t=$t"; VW=2560 VH=1080 LAB=http://localhost:${nm##*:} node tools/probe_holdboundsV.mjs 0.5 $t | grep WORST; done; done
} > ana/holdbounds_extra.txt 2>&1
echo D2 done
