#!/bin/zsh
# rejudge_p4wl: ident (?p4wl=0 vs :5162 at T1, T2, T0; lane ON T1 control) then real-loop flicker runs
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
J=$SP/work_p4/judge_p4wl; W=$SP/work_p4/p4wl; R=$SP/work_p4/rejudge_p4wl; S=$SP/slot/slot.mjs; O=$R/id
node $S run 'rejudge_p4wl:ident' -- zsh -c "cd $W
P() { node tools/identP.mjs \"\$@\" > /dev/null 2>&1; }
P --port 5162 --out $O/m_T1.json; P --port 5163 --qs p4wl=0 --out $O/off_T1.json; P --port 5163 --out $O/on_T1.json
P --port 5162 --tier T2 --out $O/m_T2.json; P --port 5163 --tier T2 --qs p4wl=0 --out $O/off_T2.json
P --port 5162 --mobile --out $O/m_T0.json; P --port 5163 --mobile --qs p4wl=0 --out $O/off_T0.json; P --port 5163 --mobile --out $O/on_T0.json"
cd $W; { for t in T1 T2 T0; do node tools/identcmp.mjs $O/m_$t.json $O/off_$t.json "p4wl=0_$t"; done
  node tools/identcmp.mjs $O/m_T0.json $O/on_T0.json lane_on_T0; node tools/identcmp.mjs $O/m_T1.json $O/on_T1.json CONTROL_lane_on_T1; } > $O/ident_summary.txt 2>&1
echo IDDONE >> $O/ident_summary.txt
node $S run 'rejudge_p4wl:rl' -- zsh -c "cd $J
for d in 2 1; do
  for p in 5162:main 5163:lane; do
    node tools/rl.mjs --frames 150 --rx 0 --ry 500 --rw 420 --rh 120 --url http://localhost:\${p%%:*}/ --qs 'tier=T1&scale=1' --dpr \$d --out $R/rl/T1d\${d}_\${p#*:} | tail -1
  done
done
for p in 5162:main 5163:lane; do
  node tools/rl.mjs --frames 150 --vw 1440 --vh 766 --rx 880 --ry 430 --rw 560 --rh 160 --url http://localhost:\${p%%:*}/ --qs 'tier=T1&scale=1' --dpr 2 --out $R/rl/T1far_\${p#*:} | tail -1
  node tools/rl.mjs --frames 150 --vw 414 --vh 720 --phone 1 --rx 0 --ry 495 --rw 414 --rh 225 --url http://localhost:\${p%%:*}/ --qs tier=T0 --dpr 2 --out $R/rl/T0wl_\${p#*:} | tail -1
done" > $R/rl/run.log 2>&1
echo RLDONE >> $R/rl/run.log
