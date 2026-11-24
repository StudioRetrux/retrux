#!/bin/zsh
# analysis of the deterministic qc-pose shots (det/): lane-only int1 vs the lane's own lab (same sim state), int1 vs MAIN, crops
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/int1
BPY=/Applications/Blender.app/Contents/Resources/5.2/python/bin/python3.13
cd $W/det
N=(q00_rest.png q01_loop15.png q03_eye.png p05_expand.png p06_sustain.png)
J() { nice $BPY -I $W/tools/jimg.py "$@" }
{
echo "== int1 ice-only (p4env=0&p4orb=0&p4hold=0) vs ice lane :5175 (expect: lake only, AA8 knee)"; J sweepdiff ice_lane ice_only $N
echo "== int1 orb-only (p4env=0&p4ice=0&p4hold=0) vs orb lane :5176 (expect: lake only, AA8 knee)"; J sweepdiff orb_lane orb_only $N
echo "== int1 (all on) vs MAIN :5199"; J sweepdiff main i $N
echo "== int1 (all on) vs int1 ice-only (= what the orb / env / hold lanes add on top of the ice)"; J sweepdiff ice_only i $N
echo "== int1 (all on) vs int1 orb-only (= what the ice / env / hold lanes add on top of the orb)"; J sweepdiff orb_only i $N
} > $W/ana/det_cmp.txt 2>&1
# hero crops: MAIN | ICE lane | ORB lane | INT1 (same sim state, same crystals)
J grid $W/img/det_q00_M_ICE_ORB_INT1.png 470,200,500,300 1 none 2 main/q00_rest.png ice_lane/q00_rest.png orb_lane/q00_rest.png i/q00_rest.png
J grid $W/img/det_q03_M_ICE_ORB_INT1.png 520,160,420,400 1 none 4 main/q03_eye.png ice_lane/q03_eye.png orb_lane/q03_eye.png i/q03_eye.png
J grid $W/img/det_p05_M_ICE_ORB_INT1.png 380,20,720,560 1 none 2 main/p05_expand.png ice_lane/p05_expand.png orb_lane/p05_expand.png i/p05_expand.png
J grid $W/img/det_q03orb_M_ICE_ORB_INT1_pct.png 620,250,210,210 2 pct 4 main/q03_eye.png ice_lane/q03_eye.png orb_lane/q03_eye.png i/q03_eye.png
echo detana done
