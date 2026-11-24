#!/bin/zsh
# judge_wl2 post-analysis (run after the chain; light): byte check of own same-pose captures vs wl2g's, blips table, real-loop tables + sheets
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
J=$SP/work_p4/judge_wl2; T=$J/tools; BPY=/Applications/Blender.app/Contents/Resources/5.2/python/bin/python3.13; cd $J
for d in d1 d2; do s=0; n=0; for f in st/${d}_J/f*.bin; do n=$((n+1)); cmp -s $f st/${d}_G4/${f:t} && s=$((s+1)); done; echo "$d own(:5167) vs wl2g d?_G4 frames byte-identical: $s / $n"; done > st/bytecmp.txt
$BPY -I $T/stan.py $T $J/st 1 $J/st/s1 d1_M d1_L d1_J d1_PX d1_gtpx > st/d1_blips.txt 2>&1
$BPY -I $T/stan.py $T $J/st 2 $J/st/s2 d2_M d2_L d2_J d2_PX gtpx2x > st/d2_blips.txt 2>&1
