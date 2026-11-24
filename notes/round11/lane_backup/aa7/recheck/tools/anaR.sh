#!/bin/zsh
# recheck: per path as the final caps land: capcmp vs the motion judge's pre-fix AA7 caps, then crawl (NEW masks; BASE / FIX / AA7 = final / GT); glide medium
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; R=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/recheck; T=$R/tools/mo; A5=$SP/work5/aa5a/caps; G=$SP/work3/aa3/caps; JM=$SP/work3/judge/motion/caps; JR=$SP/work3/judge/motion-recheck/caps; RC=$SP/work6/refl/caps
for p in reverse fast diag leave medium slow; do
  until [[ -f $R/caps/${p}_FIN/meta.json ]]; do sleep 4; done; sleep 2
  nice -n 10 node $R/tools/capcmp.mjs $R/caps/${p}_FIN $SP/work7/motion/caps/${p}_A7 0 >> $R/ana/capcmp.txt 2>&1
  gt=$G/${p}_gt; [[ $p == reverse ]] && gt=$JM/gt_reverse; [[ $p == fast || $p == diag || $p == leave ]] && gt=$RC/${p}_gt
  k1=119; [[ $p == medium ]] && k1=239; [[ $p == slow ]] && k1=159
  t0=$(date +%s)
  nice -n 10 node $T/crawl.mjs --mask $A5/${p}_mask --seq BASE=$G/${p}_base --seq FIX=$JR/fix_$p --seq AA7=$R/caps/${p}_FIN --seq GT=$gt --gt GT --ref BASE --k1 $k1 --stride 2 --out $R/ana/crawl_$p.json > $R/ana/crawl_$p.txt 2>&1
  echo "$(date +%T) crawl $p $(( $(date +%s) - t0 ))s" >> $R/logs/anaR.out
  if [[ $p == medium ]]; then
    nice -n 10 node $T/glide.mjs --mask $A5/medium_mask --motion $SP/work3/aa3/ana/medium_F.json --seq GT=$G/medium_gt --seq F1=$A5/medium_F1 --seq AA7=$R/caps/medium_FIN --seq AA7pre=$SP/work7/motion/caps/medium_A7 --gt GT --k1 239 --minc 40 --cap 1 --sstride 6 --out $R/ana/glide_medium.json 2>&1 | grep -vE "^DBG|^   " > $R/ana/glide_medium.txt &
  fi
done
wait
echo "$(date +%T) anaR end" >> $R/logs/anaR.out
