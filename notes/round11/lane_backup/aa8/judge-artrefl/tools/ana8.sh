#!/bin/zsh
# AA8 vs AA7 per path: capcmp, popscan (bloom-free masks, thr 40), popnew both ways, v3err thr 8 (toward / away GT)
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/artrefl; T=$W/tools
mask_of() { case $1 in slow|medium|reverse) echo $SP/work5/aa5b/caps/$1_bmask;; fast|diag) echo $SP/work5/aa5a/caps/$1_mask;; leave|rest) echo $SP/work6/refl/caps/$1_bmask;; esac; }
gt_of() { case $1 in slow|medium) echo $SP/work3/aa3/caps/$1_gt;; reverse) echo $SP/work5/aa5b/caps/reverse_gt;; fast|diag|leave) echo $SP/work6/refl/caps/$1_gt;; rest) echo $SP/work5/aa5b/caps/rest_gt;; esac; }
p=$1; M=$(mask_of $p); G=$(gt_of $p)
A8=$W/caps/${p}_A8; [ $p = slow ] && [ ! -d $A8 ] && A8=$SP/work8/polish/caps/slow_K06
A7=$SP/work7/motion/caps/${p}_A7; [ $p = rest ] && A7=$W/caps/rest_A7
cd $T
{
echo "### $p A8=$A8 A7=$A7 mask=$M gt=$G"
node capcmp.mjs $A8 $A7 8
node popscan.mjs --mask $M --gt $G --thr 40 --json $W/ana/popscan_$p.json A7=$A7 A8=$A8 --top 6 2>&1
echo "-- popnew A8 vs A7 (pops A8 has that A7 lacks)"; node popnew.mjs --mask $M --gt $G --x $A8 --ref $A7 --top 8
echo "-- popnew A7 vs A8 (pops A8 removes)"; node popnew.mjs --mask $M --gt $G --x $A7 --ref $A8 --top 4
echo "-- v3err A8 vs A7 (thr 8, toward/away GT)"; node v3err.mjs --mask $M --gt $G --x $A8 --ref $A7 --thr 8 --top 6
echo "-- v3err A8 vs A7 (thr 16)"; node v3err.mjs --mask $M --gt $G --x $A8 --ref $A7 --thr 16 --top 4
} > $W/ana/pop_$p.txt 2>&1
echo "ana $p done $(date +%T)"
