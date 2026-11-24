#!/bin/zsh
# AA8 recheck: per path, as the fresh capture (FINAL build) lands: (1) frame-by-frame byte compare with the motion judge's capture of
# the integrator's build (work8/motion/caps/<p>_A8); (2) G1 crawl NEW masks BASE / FIX / AA7 / AA8(fresh) / GT (= the judge's anaM.sh)
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/recheck; T=$W/tools/m; A5=$SP/work5/aa5a/caps; G=$SP/work3/aa3/caps; JM=$SP/work3/judge/motion/caps; JR=$SP/work3/judge/motion-recheck/caps; RC=$SP/work6/refl/caps; A7=$SP/work7/motion/caps; MJ=$SP/work8/motion/caps
cr() { local p=$1
  until [[ -f $W/caps/${p}_A8f/meta.json ]]; do sleep 3; done; sleep 2
  n=0; d=0; for f in $W/caps/${p}_A8f/f*.bin; do n=$((n+1)); cmp -s $f $MJ/${p}_A8/${f:t} || d=$((d+1)); done
  echo "$p frames $n, differ from the motion judge's $d" >> $W/ana/cmp_vs_judge.txt
  gt=$G/${p}_gt; [[ $p == reverse ]] && gt=$JM/gt_reverse; [[ $p == fast || $p == diag || $p == leave ]] && gt=$RC/${p}_gt
  k1=119; [[ $p == medium ]] && k1=239; [[ $p == slow ]] && k1=159
  t0=$(date +%s)
  nice -n 10 node $T/crawl.mjs --mask $A5/${p}_mask --seq BASE=$G/${p}_base --seq FIX=$JR/fix_$p --seq AA7=$A7/${p}_A7 --seq AA8=$W/caps/${p}_A8f --seq GT=$gt --gt GT --ref BASE --k1 $k1 --stride 2 --out $W/ana/crawl_$p.json > $W/ana/crawl_$p.txt 2>&1
  echo "$(date +%T) crawl $p $(( $(date +%s) - t0 ))s" >> $W/logs/anaG.out
}
( cr medium; cr fast; cr reverse ) &
( cr slow; nice -n 10 node $T/j48loc.mjs $A5/slow_mask WR 48 1 159 2 BASE=$G/slow_base A7=$A7/slow_A7 A8=$W/caps/slow_A8f GT=$G/slow_gt > $W/ana/j48loc_slow_WR48.txt 2>&1; echo "$(date +%T) j48loc" >> $W/logs/anaG.out; cr diag; cr leave ) &
wait
nice -n 10 python3 -I $T/g1tab8.py $W > $W/ana/g1tab8.txt 2>&1
echo "$(date +%T) anaG end" >> $W/logs/anaG.out
