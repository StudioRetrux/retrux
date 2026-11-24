#!/bin/zsh
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/wl3; cd $W; rm -f id/*.json
P() { node tools/identP.mjs "$@" > /dev/null 2>&1; }
P --port 5167 --out id/b_T1.json; P --port 5170 --out id/on_T1.json
P --port 5162 --out id/m_T1.json; P --port 5170 --qs p4wl=0 --out id/off_T1.json
P --port 5167 --mobile --out id/b_T0.json; P --port 5170 --mobile --out id/on_T0.json
{ node tools/identcmp.mjs id/b_T1.json id/on_T1.json "wl3_vs_5167_T1"
  node tools/identcmp.mjs id/m_T1.json id/off_T1.json "wl3_p4wl=0_vs_5162_T1"
  node tools/identcmp.mjs id/b_T0.json id/on_T0.json "wl3_vs_5167_T0"
  node tools/identcmp.mjs id/m_T1.json id/on_T1.json "CONTROL_wl3_vs_5162_T1"; } > id/ident_summary.txt 2>&1
echo done >> id/ident_summary.txt
