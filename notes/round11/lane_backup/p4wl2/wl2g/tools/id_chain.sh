#!/bin/zsh
# wl2g ident: ?wl2g=0 vs :5163 (L_* = p4wl fixer final, frozen :5163) and ?p4wl=0 vs :5162 (m_*), T1 / T2 / T0 phone / p04 p06 p07
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
W=$SP/work_p4/wl2g; S=$SP/slot/slot.mjs; cd $W
P() { node $S run "wl2g:ident" -- node tools/identP.mjs "$@" > /dev/null 2>&1; }
Q() { node $S run "wl2g:ident" -- node tools/identPose.mjs "$@" > /dev/null 2>&1; }
P --port 5164 --qs wl2g=0 --out id/g0_T1.json; P --port 5164 --qs p4wl=0 --out id/p0_T1.json; P --port 5164 --out id/on_T1.json
P --port 5164 --tier T2 --qs wl2g=0 --out id/g0_T2.json; P --port 5164 --tier T2 --qs p4wl=0 --out id/p0_T2.json
P --port 5164 --mobile --qs wl2g=0 --out id/g0_T0.json; P --port 5164 --mobile --qs p4wl=0 --out id/p0_T0.json; P --port 5164 --mobile --out id/on_T0.json
for p in expand,0.9 expand,2.97 release,0.33; do n=${p/,/_}; Q --port 5164 --qs wl2g=0 --pose $p --out id/g0_$n.json; Q --port 5164 --qs p4wl=0 --pose $p --out id/p0_$n.json; done
{ for t in T1 T2 T0 expand_0.9 expand_2.97 release_0.33; do node tools/identcmp.mjs id/L_$t.json id/g0_$t.json "wl2g=0_vs_5163_$t"; done
  for t in T1 T2 T0 expand_0.9 expand_2.97 release_0.33; do node tools/identcmp.mjs id/m_$t.json id/p0_$t.json "p4wl=0_vs_5162_$t"; done
  node tools/identcmp.mjs id/L_T0.json id/on_T0.json "lane_on_vs_5163_T0"; node tools/identcmp.mjs id/L_T1.json id/on_T1.json "CONTROL_lane_on_vs_5163_T1"; } > id/ident_summary.txt 2>&1
echo IDDONE >> id/ident_summary.txt
