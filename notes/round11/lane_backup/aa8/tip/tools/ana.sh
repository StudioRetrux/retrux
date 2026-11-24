#!/bin/zsh
# AA8 tip: per path once caps/<p>_TIP lands: capcmp vs AA7, popscan AA7 / TIP vs GT (bloom-free masks), popnew both ways, v3err, crawl (medium / reverse)
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/tip; T=$W/tools/ar
A5=$SP/work5/aa5a/caps; G=$SP/work3/aa3/caps; JM=$SP/work3/judge/motion/caps; JR=$SP/work3/judge/motion-recheck/caps; RC=$SP/work6/refl/caps
mask_of() { case $1 in slow|medium|reverse) echo $SP/work5/aa5b/caps/$1_bmask;; fast|diag) echo $SP/work5/aa5a/caps/$1_mask;; leave|rest) echo $SP/work6/refl/caps/$1_bmask;; esac; }
gt_of() { case $1 in slow|medium) echo $SP/work3/aa3/caps/$1_gt;; reverse) echo $SP/work5/aa5b/caps/reverse_gt;; fast|diag|leave) echo $SP/work6/refl/caps/$1_gt;; esac; }
for p in "$@"; do
  until [[ -f $W/caps/${p}_TIP/meta.json ]]; do sleep 4; done; sleep 2
  A7=$SP/work7/motion/caps/${p}_A7; X=$W/caps/${p}_TIP; M=$(mask_of $p); GT=$(gt_of $p)
  {
  echo "### $p mask=$M gt=$GT"
  node $W/tools/capcmp.mjs $X $A7 8
  node $T/popscan.mjs --mask $M --gt $GT --thr 40 A7=$A7 TIP=$X --top 6 2>&1
  echo "-- popnew TIP vs A7 (new pops)"; node $T/popnew.mjs --mask $M --gt $GT --x $X --ref $A7 --top 8
  echo "-- popnew A7 vs TIP (pops TIP removes)"; node $T/popnew.mjs --mask $M --gt $GT --x $A7 --ref $X --top 4
  echo "-- v3err TIP vs A7 (thr 8, toward/away GT)"; node $T/v3err.mjs --mask $M --gt $GT --x $X --ref $A7 --thr 8 --top 6
  } > $W/ana/pop_$p.txt 2>&1
  if [[ $p == medium || $p == reverse ]]; then
    gt=$G/${p}_gt; [[ $p == reverse ]] && gt=$JM/gt_reverse
    k1=119; [[ $p == medium ]] && k1=239
    nice -n 10 node $W/tools/mo/crawl.mjs --mask $A5/${p}_mask --seq BASE=$G/${p}_base --seq FIX=$JR/fix_$p --seq AA7=$X --seq GT=$gt --gt GT --ref BASE --k1 $k1 --stride 2 --out $W/ana/crawl_$p.json > $W/ana/crawl_$p.txt 2>&1
  fi
  echo "$(date +%T) ana $p done"
done
