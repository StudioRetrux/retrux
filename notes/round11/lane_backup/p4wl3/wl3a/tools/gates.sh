#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
W=$SP/work_p4/wl2/fix; S=$SP/slot/slot.mjs; T=$W/tools; cd $W
log() { echo "$(date +%T) $*" >> $W/run.log; }
P() { node $S run "wl2fix:ident" -- node $T/identP.mjs "$@" > /dev/null 2>&1; }
Q() { node $S run "wl2fix:ident" -- node $T/identPose.mjs "$@" > /dev/null 2>&1; }
C() { local tag=$1; shift; node $S run "wl2fix:st-$tag" -- node $T/cap.mjs --tier T1 --path fast --frames 120 "$@" --out st/$tag > st/$tag.log 2>&1; log "st $tag $(tail -1 st/$tag.log | cut -c1-90)"; }
{ C d2_F --port 5167 --rows 380,766 --dsf 2; C d1_F --port 5167 --rows 380,766; C d2_F0 --port 5167 --rows 380,766 --dsf 2 --qs wl2fj=0; log ST DONE; } &
log ident start
P --port 5163 --out id/L_T1.json; P --port 5167 --qs wl2g=0 --out id/g0_T1.json
P --port 5162 --out id/m_T1.json; P --port 5167 --qs p4wl=0 --out id/p0_T1.json
P --port 5164 --out id/G_T1.json; P --port 5167 --qs wl2fj=0 --out id/f0_T1.json
P --port 5163 --tier T2 --out id/L_T2.json; P --port 5167 --tier T2 --qs wl2g=0 --out id/g0_T2.json
P --port 5164 --tier T2 --out id/G_T2.json; P --port 5167 --tier T2 --qs wl2fj=0 --out id/f0_T2.json
P --port 5162 --mobile --out id/m_T0.json; P --port 5167 --mobile --out id/on_T0.json; P --port 5167 --mobile --qs p4wl=0 --out id/p0_T0.json
Q --port 5163 --pose release,0.33 --out id/L_rel.json; Q --port 5167 --qs wl2g=0 --pose release,0.33 --out id/g0_rel.json
Q --port 5162 --pose expand,2.97 --out id/m_exp.json; Q --port 5167 --qs p4wl=0 --pose expand,2.97 --out id/p0_exp.json
Q --port 5164 --pose expand,0.9 --out id/G_p04.json; Q --port 5167 --qs wl2fj=0 --pose expand,0.9 --out id/f0_p04.json
P --port 5167 --out id/on_T1.json
{ node $T/identcmp.mjs id/L_T1.json id/g0_T1.json "wl2g=0(all off)_vs_5163_T1"
  node $T/identcmp.mjs id/m_T1.json id/p0_T1.json "p4wl=0_vs_5162_T1"
  node $T/identcmp.mjs id/G_T1.json id/f0_T1.json "wl2fj=0_vs_5164(prefix)_T1"
  node $T/identcmp.mjs id/L_T2.json id/g0_T2.json "wl2g=0(all off)_vs_5163_T2"
  node $T/identcmp.mjs id/G_T2.json id/f0_T2.json "wl2fj=0_vs_5164(prefix)_T2"
  node $T/identcmp.mjs id/m_T0.json id/p0_T0.json "p4wl=0_vs_5162_T0phone"
  node $T/identcmp.mjs id/m_T0.json id/on_T0.json "ON_vs_5162_T0phone"
  node $T/identcmp.mjs id/L_rel.json id/g0_rel.json "wl2g=0_vs_5163_release0.33"
  node $T/identcmp.mjs id/m_exp.json id/p0_exp.json "p4wl=0_vs_5162_expand2.97"
  node $T/identcmp.mjs id/G_p04.json id/f0_p04.json "wl2fj=0_vs_5164_expand0.9"
  node $T/identcmp.mjs id/G_T1.json id/on_T1.json "CONTROL_ON_vs_5164_T1"; } > id/ident_summary.txt 2>&1
log IDENT DONE
wait; log GATES DONE
