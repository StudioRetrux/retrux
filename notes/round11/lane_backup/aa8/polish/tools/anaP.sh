#!/bin/zsh
# AA8 polish: popnew (pops of K that AA6 does not have even at thr-10) per path, bloom-free masks as the art judge
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/polish; T=$W/tools; C=$W/caps; MO=$SP/work7/motion/caps
mask_of() { case $1 in slow|medium|reverse) echo $SP/work5/aa5b/caps/$1_bmask;; fast|diag) echo $SP/work5/aa5a/caps/$1_mask;; leave|rest) echo $SP/work6/refl/caps/$1_bmask;; esac; }
gt_of() { case $1 in slow|medium) echo $SP/work3/aa3/caps/$1_gt;; reverse) echo $SP/work5/aa5b/caps/reverse_gt;; fast|diag|leave) echo $SP/work6/refl/caps/$1_gt;; esac; }
k10() { [[ $1 == slow ]] && echo $C/slow_K10 || echo $MO/$1_A7; }
if (( $# )); then paths=($@); else paths=(slow medium reverse fast diag leave); fi
for p in $paths; do
  ( for K in K06 K07 K08 K09 K10; do X=$C/${p}_$K; [[ $K == K10 ]] && X=$(k10 $p)
      echo "-- $p $K vs A6: $(nice -n 10 node $T/ar/popnew.mjs --mask $(mask_of $p) --gt $(gt_of $p) --x $X --ref $C/${p}_A6 --top 4 | tr '\n' ' ')"
    done > $W/ana/popnew_$p.txt 2>&1; echo "$(date +%T) popnew $p" ) &
done
wait
