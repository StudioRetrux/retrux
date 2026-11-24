#!/bin/zsh
# pop gate for one path: lane default (caps/pop/<p>_L) vs AA8 (work8/motion/caps/<p>_A8), bloom-free masks + GTs as AA8's tip LOG
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work_p4/p4water; T=$W/tools/pop
mask_of() { case $1 in slow|medium|reverse) echo $SP/work5/aa5b/caps/$1_bmask;; fast|diag) echo $SP/work5/aa5a/caps/$1_mask;; leave|rest) echo $SP/work6/refl/caps/$1_bmask;; esac; }
gt_of() { case $1 in slow|medium) echo $SP/work3/aa3/caps/$1_gt;; reverse) echo $SP/work5/aa5b/caps/reverse_gt;; fast|diag|leave) echo $SP/work6/refl/caps/$1_gt;; esac; }
p=$1; A8=$SP/work8/motion/caps/${p}_A8; X=$W/caps/pop/${p}_${2:-L}; M=$(mask_of $p); GT=$(gt_of $p)
{
echo "### $p mask=$M gt=$GT"
node $T/popscan.mjs --mask $M --gt $GT --thr 40 A8=$A8 LANE=$X --top 4 2>&1
echo "-- popnew LANE vs A8 (new pops)"; node $T/popnew.mjs --mask $M --gt $GT --x $X --ref $A8 --top 10
echo "-- popnew A8 vs LANE (pops the lane removes)"; node $T/popnew.mjs --mask $M --gt $GT --x $A8 --ref $X --top 4
} > $W/ana/pop_${p}_${2:-L}.txt 2>&1
echo "pop $p done $(date +%T)"
