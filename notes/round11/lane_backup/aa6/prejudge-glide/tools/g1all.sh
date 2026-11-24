#!/bin/zsh
# prejudge-glide G1: crawl per box, all six paths, two mask sets: NEW = aa5a's bloom-free masks (the integrator's), OLD = the motion
# judge's cap.mjs masks (its G1 table). Seqs: BASE, FIX (= aa3_fixed1, the motion recheck's caps), AA6 (mine), GT where it exists.
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/glide; T=$W/tools; A5=$SP/work5/aa5a/caps; G=$SP/work3/aa3/caps; JM=$SP/work3/judge/motion/caps; JR=$SP/work3/judge/motion-recheck/caps
run() { # name mask k1 stride seqs...
  local name=$1 mask=$2 k1=$3 st=$4; shift 4
  until [[ -f $W/caps/${name#*_}_A6/meta.json ]]; do sleep 5; done
  t0=$(date +%s)
  nice -n 10 node $T/crawl.mjs --mask $mask "$@" --ref BASE --k1 $k1 --stride $st --out $W/ana/crawl$name.json > $W/ana/crawl$name.txt 2>&1
  echo "crawl$name $(( $(date +%s) - t0 ))s"
}
p=$1
gtn=""; gts=()
[[ $p == slow ]] && gts=(--seq GT=$G/slow_gt --gt GT)
[[ $p == medium ]] && gts=(--seq GT=$G/medium_gt --gt GT)
[[ $p == reverse ]] && gts=(--seq GT=$JM/gt_reverse --gt GT)
k1new=239; [[ $p == fast || $p == diag || $p == reverse || $p == leave ]] && k1new=119
a6=$W/caps/${p}_A6; [[ $p == medium ]] && a6=$SP/work6/integ/caps/medium_A6
run NEW_$p $A5/${p}_mask $k1new 2 --seq BASE=$G/${p}_base --seq FIX=$JR/fix_$p --seq AA6=$a6 ${gts[@]}
run OLD_$p $JM/base_$p 239 2 --seq BASE=$JM/base_$p --seq FIX=$JR/fix_$p --seq AA6=$a6 ${gts[@]}
