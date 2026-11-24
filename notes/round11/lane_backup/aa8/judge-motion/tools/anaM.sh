#!/bin/zsh
# judge8-motion: G1 crawl (NEW masks) per path BASE / FIX / AA7 (work7 caps) / AA8 / GT; G1c glide slow / medium (GT, F1, AA7, AA8);
# stepped G6 medium; exact J48 / J32 events slow WR (j48loc).
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/motion; T=$W/tools; A5=$SP/work5/aa5a/caps; G=$SP/work3/aa3/caps; JM=$SP/work3/judge/motion/caps; JR=$SP/work3/judge/motion-recheck/caps; RC=$SP/work6/refl/caps; A7=$SP/work7/motion/caps; PC=$SP/work8/polish/caps
cr() { local p=$1
  until [[ -f $W/caps/${p}_A8/meta.json ]]; do sleep 4; done; sleep 2
  gt=$G/${p}_gt; [[ $p == reverse ]] && gt=$JM/gt_reverse; [[ $p == fast || $p == diag || $p == leave ]] && gt=$RC/${p}_gt
  k1=119; [[ $p == medium ]] && k1=239; [[ $p == slow ]] && k1=159
  t0=$(date +%s)
  nice -n 10 node $T/crawl.mjs --mask $A5/${p}_mask --seq BASE=$G/${p}_base --seq FIX=$JR/fix_$p --seq AA7=$A7/${p}_A7 --seq AA8=$W/caps/${p}_A8 --seq GT=$gt --gt GT --ref BASE --k1 $k1 --stride 2 --out $W/ana/crawl_$p.json > $W/ana/crawl_$p.txt 2>&1
  echo "$(date +%T) crawl $p $(( $(date +%s) - t0 ))s" >> $W/logs/anaM.out
}
( cr slow ) &
( cr medium; for p in reverse fast; do cr $p; done ) &
( until [[ -f $W/caps/medium_A8/meta.json ]]; do sleep 4; done
  nice -n 10 node $T/rlana.mjs --mask $JM/base_medium $W/caps/medium_A8 $A7/medium_A7 $G/medium_base > $W/ana/g6_stepped_medium.txt 2>&1; echo "$(date +%T) g6 stepped" >> $W/logs/anaM.out
  nice -n 10 node $T/j48loc.mjs $A5/slow_mask WR 48 1 159 2 BASE=$G/slow_base A6=$PC/slow_A6 A7=$A7/slow_A7 A8=$W/caps/slow_A8 K06=$PC/slow_K06 GT=$G/slow_gt > $W/ana/j48loc_slow_WR48.txt 2>&1; echo "$(date +%T) j48loc WR48" >> $W/logs/anaM.out
  nice -n 10 node $T/glide.mjs --mask $A5/medium_mask --motion $SP/work3/aa3/ana/medium_F.json --seq GT=$G/medium_gt --seq F1=$A5/medium_F1 --seq AA7=$A7/medium_A7 --seq AA8=$W/caps/medium_A8 --gt GT --k1 239 --minc 40 --cap 1 --sstride 6 --out $W/ana/glide_medium.json > $W/ana/glide_medium.raw 2>&1; echo "$(date +%T) glide medium" >> $W/logs/anaM.out
  for p in diag leave; do cr $p; done ) &
( until [[ -f $W/caps/slow_A8/meta.json ]]; do sleep 4; done
  nice -n 10 node $T/glide.mjs --mask $A5/slow_mask --motion $SP/work3/aa3/ana/slow_C3.json --seq GT=$G/slow_gt --seq F1=$A5/slow_F1 --seq AA7=$A7/slow_A7 --seq AA8=$W/caps/slow_A8 --gt GT --k1 159 --minc 40 --cap 1 --sstride 6 --out $W/ana/glide_slow.json > $W/ana/glide_slow.raw 2>&1; echo "$(date +%T) glide slow" >> $W/logs/anaM.out ) &
wait
echo "$(date +%T) anaM end" >> $W/logs/anaM.out
