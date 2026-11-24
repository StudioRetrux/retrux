#!/bin/zsh
# judge-motion (final): G1 crawl (NEW masks) per path BASE / FIX / AA7 (+AA6 reverse, fast) / GT as caps land; G1c glide slow / medium
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work7/motion; T=$W/tools; A5=$SP/work5/aa5a/caps; G=$SP/work3/aa3/caps; JM=$SP/work3/judge/motion/caps; JR=$SP/work3/judge/motion-recheck/caps; RC=$SP/work6/refl/caps
for p in medium slow reverse fast diag leave; do
  until [[ -f $W/caps/${p}_A7/meta.json ]]; do sleep 4; done; sleep 2
  gt=$G/${p}_gt; [[ $p == reverse ]] && gt=$JM/gt_reverse; [[ $p == fast || $p == diag || $p == leave ]] && gt=$RC/${p}_gt
  k1=119; [[ $p == medium ]] && k1=239; [[ $p == slow ]] && k1=159
  extra=(); if [[ $p == reverse || $p == fast ]]; then until [[ -f $W/caps/${p}_A6/meta.json ]]; do sleep 4; done; sleep 2; extra=(--seq AA6=$W/caps/${p}_A6); fi
  t0=$(date +%s)
  nice -n 10 node $T/crawl.mjs --mask $A5/${p}_mask --seq BASE=$G/${p}_base --seq FIX=$JR/fix_$p --seq AA7=$W/caps/${p}_A7 $extra --seq GT=$gt --gt GT --ref BASE --k1 $k1 --stride 2 --out $W/ana/crawl_$p.json > $W/ana/crawl_$p.txt 2>&1
  echo "$(date +%T) crawl $p $(( $(date +%s) - t0 ))s" >> $W/logs/anaG.out
  if [[ $p == medium ]]; then
    nice -n 10 node $T/glide.mjs --mask $A5/medium_mask --motion $SP/work3/aa3/ana/medium_F.json --seq GT=$G/medium_gt --seq F1=$A5/medium_F1 --seq AA7=$W/caps/medium_A7 --gt GT --k1 239 --minc 40 --cap 1 --sstride 6 --out $W/ana/glide_medium.json > $W/ana/glide_medium.raw 2>&1 &
  fi
  if [[ $p == slow ]]; then
    nice -n 10 node $T/glide.mjs --mask $A5/slow_mask --motion $SP/work3/aa3/ana/slow_C3.json --seq GT=$G/slow_gt --seq F1=$A5/slow_F1 --seq AA7=$W/caps/slow_A7 --gt GT --k1 159 --minc 40 --cap 1 --sstride 6 --out $W/ana/glide_slow.json > $W/ana/glide_slow.raw 2>&1 &
  fi
done
wait
echo "$(date +%T) anaG end" >> $W/logs/anaG.out
