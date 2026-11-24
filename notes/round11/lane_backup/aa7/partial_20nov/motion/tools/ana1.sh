#!/bin/zsh
# fixer: G1 crawl (NEW masks) per path as its capture lands, then G1c glide on slow / medium
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; F=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/fix; T=$F/tools; A5=$SP/work5/aa5a/caps; G=$SP/work3/aa3/caps; JM=$SP/work3/judge/motion/caps; JR=$SP/work3/judge/motion-recheck/caps
for p in slow medium fast diag reverse leave; do
  until [[ -f $F/caps/${p}_A6n/meta.json ]]; do sleep 4; done
  gts=(); [[ $p == slow ]] && gts=(--seq GT=$G/slow_gt --gt GT); [[ $p == medium ]] && gts=(--seq GT=$G/medium_gt --gt GT); [[ $p == reverse ]] && gts=(--seq GT=$JM/gt_reverse --gt GT)
  k1=239; [[ $p == fast || $p == diag || $p == reverse || $p == leave ]] && k1=119; [[ $p == slow ]] && k1=159
  old=$SP/work6/glide/caps/${p}_A6; [[ $p == medium ]] && old=$SP/work6/integ/caps/medium_A6
  t0=$(date +%s)
  nice -n 10 node $T/crawl.mjs --mask $A5/${p}_mask --seq BASE=$G/${p}_base --seq FIX=$JR/fix_$p --seq AA6=$old --seq AA6N=$F/caps/${p}_A6n ${gts[@]} --ref BASE --k1 $k1 --stride 2 --out $F/ana/crawl_$p.json > $F/ana/crawl_$p.txt 2>&1
  echo "crawl $p $(( $(date +%s) - t0 ))s"
done
t0=$(date +%s)
nice -n 10 node $T/glide.mjs --mask $A5/slow_mask --motion $SP/work3/aa3/ana/slow_C3.json --seq GT=$G/slow_gt --seq F1=$A5/slow_F1 --seq AA6=$SP/work6/glide/caps/slow_A6 --seq AA6N=$F/caps/slow_A6n --gt GT --k1 159 --minc 40 --cap 1 --sstride 6 --out $F/ana/glide_slow.json 2>&1 | grep -vE "^DBG|^   " > $F/ana/glide_slow.txt
echo "glide slow $(( $(date +%s) - t0 ))s"
nice -n 10 node $T/glide.mjs --mask $A5/medium_mask --motion $SP/work3/aa3/ana/medium_F.json --seq GT=$G/medium_gt --seq F1=$A5/medium_F1 --seq AA6=$SP/work6/integ/caps/medium_A6 --seq AA6N=$F/caps/medium_A6n --gt GT --k1 239 --minc 40 --cap 1 --sstride 6 --out $F/ana/glide_medium.json 2>&1 | grep -vE "^DBG|^   " > $F/ana/glide_medium.txt
echo "glide medium $(( $(date +%s) - t0 ))s"
