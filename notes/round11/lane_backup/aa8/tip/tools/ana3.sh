#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/tip; T=$W/tools/ar
mask_of() { case $1 in slow|medium|reverse) echo $SP/work5/aa5b/caps/$1_bmask;; fast|diag) echo $SP/work5/aa5a/caps/$1_mask;; leave|rest) echo $SP/work6/refl/caps/$1_bmask;; esac; }
gt_of() { case $1 in slow|medium) echo $SP/work3/aa3/caps/$1_gt;; reverse) echo $SP/work5/aa5b/caps/reverse_gt;; fast|diag|leave) echo $SP/work6/refl/caps/$1_gt;; esac; }
p=$1; A7=$SP/work7/motion/caps/${p}_A7; X=$W/caps/${p}_TIP; M=$(mask_of $p); GT=$(gt_of $p)
{
echo "### $p mask=$M gt=$GT"
node $W/tools/capcmp.mjs $X $A7 8
node $T/popscan.mjs --mask $M --gt $GT --thr 40 A7=$A7 TIP=$X --top 4 2>&1
echo "-- popnew TIP vs A7 (new pops)"; node $T/popnew.mjs --mask $M --gt $GT --x $X --ref $A7 --top 8
echo "-- popnew A7 vs TIP (pops TIP removes)"; node $T/popnew.mjs --mask $M --gt $GT --x $A7 --ref $X --top 4
} > $W/ana/pop3_$p.txt 2>&1
echo "pop $p done $(date +%T)"
