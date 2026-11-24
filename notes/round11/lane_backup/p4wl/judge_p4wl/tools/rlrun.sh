#!/bin/zsh
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4wl
S=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/slot/slot.mjs
cd $J
R() { node tools/rl.mjs --frames 150 "$@" 2>&1 | tail -1; }
node $S run 'judge_p4wl:rl-T1' -- zsh -c "
cd $J
for d in 2 1; do
  node tools/rl.mjs --frames 150 --rx 0 --ry 500 --rw 420 --rh 120 --url http://localhost:5162/ --qs tier=T1 --dpr \$d --out rl/T1d\${d}_main | tail -1
  node tools/rl.mjs --frames 150 --rx 0 --ry 500 --rw 420 --rh 120 --url http://localhost:5163/ --qs tier=T1 --dpr \$d --out rl/T1d\${d}_lane | tail -1
  node tools/rl.mjs --frames 150 --rx 0 --ry 500 --rw 420 --rh 120 --url http://localhost:5163/ --qs 'tier=T1&wlwalk=px' --dpr \$d --out rl/T1d\${d}_px | tail -1
done"
node $S run 'judge_p4wl:rl-T2' -- zsh -c "
cd $J
for p in 5162:main 5163:lane; do
  node tools/rl.mjs --frames 150 --rx 0 --ry 500 --rw 420 --rh 120 --url http://localhost:\${p%%:*}/ --qs tier=T2 --dpr 2 --out rl/T2d2_\${p#*:} | tail -1
  node tools/rl.mjs --frames 150 --vw 1440 --vh 766 --rx 880 --ry 430 --rw 560 --rh 160 --url http://localhost:\${p%%:*}/ --qs tier=T2 --dpr 2 --out rl/T2far_\${p#*:} | tail -1
  node tools/rl.mjs --frames 150 --vw 414 --vh 720 --phone 1 --rx 0 --ry 330 --rw 414 --rh 160 --url http://localhost:\${p%%:*}/ --qs tier=T0 --dpr 2 --out rl/T0_\${p#*:} | tail -1
done"
echo RLDONE
