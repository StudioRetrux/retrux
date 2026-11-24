#!/bin/zsh
# verify_int1: deterministic qc poses (same sim state in every lab): int1 hold-only vs the hold lane :5178 (expect lake-only = AA8 knee? no: both are aa8-based -> expect IDENTICAL),
# int1 all-on vs hold-only (what env/ice/orb add), int1 vs MAIN
V=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/verify_int1
BPY=/Applications/Blender.app/Contents/Resources/5.2/python/bin/python3.13
cd $V/det
N=(q00_rest.png q01_loop15.png q03_eye.png p05_expand.png p06_sustain.png)
J() { nice $BPY -I $V/tools/jimg.py "$@" 2>&1 | grep -v "ImageBuf\|pending\|FreeType\|retrieved" }
{
echo "== int1 hold-only (p4env=0&p4ice=0&p4orb=0) vs hold lane :5178 (both aa8-based: expect identical)"; J sweepdiff hold_lane hold_only $N
echo "== int1 (all on) vs int1 hold-only (= what env / ice / orb add on top of the hold)"; J sweepdiff hold_only i $N
echo "== int1 (all on) vs MAIN :5199"; J sweepdiff main i $N
echo "== hold lane vs MAIN :5199 (the hold lane's own change)"; J sweepdiff main hold_lane $N
} > $V/ana/det_cmp.txt 2>&1
J grid $V/img/det_p05_M_HOLD_HOLDONLY_INT1.png 300,0,840,766 1 none 2 main/p05_expand.png hold_lane/p05_expand.png hold_only/p05_expand.png i/p05_expand.png
J grid $V/img/det_p06_M_HOLD_HOLDONLY_INT1.png 300,0,840,766 1 none 2 main/p06_sustain.png hold_lane/p06_sustain.png hold_only/p06_sustain.png i/p06_sustain.png
echo detana done
