#!/bin/zsh
# judge chain A (stepped, not timing-sensitive): ident T1/T2, then 60 fps sparkle at T2 (near + far clips)
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
J=$SP/work_p4/judge_p4wl; S=$SP/slot/slot.mjs; BPY=/Applications/Blender.app/Contents/Resources/5.2/python/bin/python3.13
cd $J; mkdir -p id caps
until grep -q RLDONE rl/run.log; do sleep 5; done
node $S run 'judge_p4wl:ident' -- zsh -c "cd $J
node tools/identP.mjs --port 5162 --out id/m_T1.json >/dev/null 2>&1
node tools/identP.mjs --port 5163 --qs p4wl=0 --out id/off_T1.json >/dev/null 2>&1
node tools/identP.mjs --port 5163 --out id/on_T1.json >/dev/null 2>&1
node tools/identP.mjs --port 5162 --tier T2 --out id/m_T2.json >/dev/null 2>&1
node tools/identP.mjs --port 5163 --tier T2 --qs p4wl=0 --out id/off_T2.json >/dev/null 2>&1"
{ node tools/identcmp.mjs id/m_T1.json id/off_T1.json p4wl=0_T1; node tools/identcmp.mjs id/m_T1.json id/on_T1.json lane_default_T1; node tools/identcmp.mjs id/m_T2.json id/off_T2.json p4wl=0_T2; } > id/ident_summary.txt 2>&1
echo IDDONE >> id/ident_summary.txt
for spec in near:300,540,940,226 far:860,420,580,200; do n=${spec%%:*}; c=${spec#*:}
 for p in 5162:main 5163:lane; do port=${p%%:*}; b=${p#*:}
  node $S run "judge_p4wl:s60-$n-$b" -- zsh -c "cd $J; LAB=http://localhost:$port TIER=T2 CLIP=$c PREFIX=s node tools/shoot_ripple.mjs caps/s60_${n}_$b 40 0.0166666667 100 > caps/s60_${n}_$b.log 2>&1; LAB=http://localhost:$port TIER=T2 DPR=2 CLIP=$c PREFIX=s node tools/shoot_ripple.mjs caps/s60_${n}_${b}_2x 40 0.0166666667 100 > caps/s60_${n}_${b}_2x.log 2>&1"
  $BPY -I tools/down2.py caps/s60_${n}_${b}_2x caps/s60_${n}_${b}_gt && rm -rf caps/s60_${n}_${b}_2x
 done
done
echo S60DONE > caps/S60DONE
