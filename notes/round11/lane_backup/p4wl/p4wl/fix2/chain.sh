#!/bin/zsh
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4wl; J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4wl; S=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/slot/slot.mjs
cd $W
node $S run 'p4wl:ident' -- zsh -c '
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4wl
P() { node tools/identP.mjs "$@" > /dev/null 2>&1; }
Q() { node tools/identPose.mjs "$@" > /dev/null 2>&1; }
O=fix2/id
P --port 5162 --out $O/m_T1.json; P --port 5163 --qs p4wl=0 --out $O/off_T1.json; P --port 5163 --out $O/on_T1.json; P --port 5163 --qs wlwalk=q --out $O/q_T1.json
P --port 5162 --tier T2 --out $O/m_T2.json; P --port 5163 --tier T2 --qs p4wl=0 --out $O/off_T2.json; P --port 5163 --tier T2 --out $O/on_T2.json
P --port 5162 --mobile --out $O/m_T0.json; P --port 5163 --mobile --qs p4wl=0 --out $O/off_T0.json; P --port 5163 --mobile --out $O/on_T0.json
for p in expand,0.9 expand,2.97 release,0.33; do n=${p/,/_}; Q --port 5162 --pose $p --out $O/m_$n.json; Q --port 5163 --qs p4wl=0 --pose $p --out $O/off_$n.json; Q --port 5163 --pose $p --out $O/on_$n.json; done
{ for t in T1 T2 T0 expand_0.9 expand_2.97 release_0.33; do node tools/identcmp.mjs $O/m_$t.json $O/off_$t.json "p4wl=0_$t"; done
  node tools/identcmp.mjs $O/m_T1.json $O/q_T1.json "wlwalk=q_T1"; node tools/identcmp.mjs $O/m_T0.json $O/on_T0.json "lane_on_T0"
  for t in T1 T2 expand_0.9 expand_2.97 release_0.33; do node tools/identcmp.mjs $O/m_$t.json $O/on_$t.json "CONTROL_lane_on_$t"; done; } > $O/ident_summary.txt 2>&1
echo done >> $O/ident_summary.txt'
node $S run 'p4wl:rl' -- zsh -c '
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4wl
R=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4wl/fix2/rl
for d in 2 1; do
  node tools/rl.mjs --frames 150 --rx 0 --ry 500 --rw 420 --rh 120 --url http://localhost:5162/ --qs tier=T1 --dpr $d --out $R/T1d${d}_main | tail -1
  node tools/rl.mjs --frames 150 --rx 0 --ry 500 --rw 420 --rh 120 --url http://localhost:5163/ --qs tier=T1 --dpr $d --out $R/T1d${d}_lane | tail -1
done
for p in 5162:main 5163:lane; do
  node tools/rl.mjs --frames 150 --vw 1440 --vh 766 --rx 880 --ry 430 --rw 560 --rh 160 --url http://localhost:${p%%:*}/ --qs tier=T2 --dpr 2 --out $R/T2far_${p#*:} | tail -1
  node tools/rl.mjs --frames 150 --vw 414 --vh 720 --phone 1 --rx 0 --ry 495 --rw 414 --rh 225 --url http://localhost:${p%%:*}/ --qs tier=T0 --dpr 2 --out $R/T0wl_${p#*:} | tail -1
done' > /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4wl/fix2/rl/run.log 2>&1
echo CHAINDONE >> /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4wl/fix2/rl/run.log
