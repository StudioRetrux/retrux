#!/bin/bash
# pop scan for one path: popscan A7/A6/FIX1 vs GT (bloom-free mask), popnew A7 vs FIX1 / A6, v3err A7 vs A6 (toward / away GT)
source /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/artrefl/tools/paths.sh
p=$1; cd $W/tools; M=$(mask_of $p); G=$(gt_of $p); F=$(fix_of $p); A7=$W/caps/${p}_A7; A6=$W/caps/${p}_A6
{
echo "### $p  mask=$M gt=$G fix=$F"
node popscan.mjs --mask $M --gt $G --thr 40 --json $W/ana/popscan_$p.json A7=$A7 A6=$A6 FIX1=$F --top 8 2>&1
echo "-- popnew A7 vs FIX1"; node popnew.mjs --mask $M --gt $G --x $A7 --ref $F --top 8
echo "-- popnew A7 vs A6"; node popnew.mjs --mask $M --gt $G --x $A7 --ref $A6 --top 8
echo "-- popnew A6 vs FIX1"; node popnew.mjs --mask $M --gt $G --x $A6 --ref $F --top 3
echo "-- v3err A7 vs A6 (thr 8, toward/away GT)"; node v3err.mjs --mask $M --gt $G --x $A7 --ref $A6 --thr 8 --top 6
} > $W/ana/pop_$p.txt 2>&1
echo done $p
