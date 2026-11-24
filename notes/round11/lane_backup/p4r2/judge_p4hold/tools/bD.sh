#!/bin/zsh
# judge_p4hold batch D: ring extents (bbox of every ring piece, 16 press moments) at p04 (t 0.9) and p06 (t 2.97), 3 viewports, MAIN vs lane
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4hold
cd $J
for vp in 1440x766 1280x800 1920x1080; do
  VW=${vp%x*}; VH=${vp#*x}
  for t in 0.9 2.97; do
    for nm in MAIN:5199 LANE:5178; do
      echo "== ${nm%%:*} $vp t=$t"
      VW=$VW VH=$VH LAB=http://localhost:${nm##*:} node tools/probe_holdboundsV.mjs 0.5 $t | grep WORST
    done
  done
done > ana/holdbounds3.txt 2>&1
echo D done
