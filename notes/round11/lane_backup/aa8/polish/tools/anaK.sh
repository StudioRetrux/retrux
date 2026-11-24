#!/bin/zsh
# AA8 polish knee study analysis: crawl (NEW masks; BASE / FIX / A6 / K06..K09 / K10 / GT) per path, kerr (thin-dark + waterline
# lines vs GT) on medium + rest, j48loc slow WR (exact events), popnew K vs AA6 per path.
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/polish; T=$W/tools; C=$W/caps
A5=$SP/work5/aa5a/caps; G=$SP/work3/aa3/caps; JM=$SP/work3/judge/motion/caps; JR=$SP/work3/judge/motion-recheck/caps; RC=$SP/work6/refl/caps; MO=$SP/work7/motion/caps
k10() { [[ $1 == slow ]] && echo $C/slow_K10 || echo $MO/$1_A7; }
gt_of() { case $1 in slow|medium) echo $G/$1_gt;; reverse) echo $JM/gt_reverse;; fast|diag|leave) echo $RC/$1_gt;; esac; }
crawlp() {
  p=$1; k1=119; [[ $p == medium ]] && k1=239; [[ $p == slow ]] && k1=159
  t0=$(date +%s)
  nice -n 10 node $T/mo/crawl.mjs --mask $A5/${p}_mask --seq BASE=$G/${p}_base --seq FIX=$JR/fix_$p --seq A6=$C/${p}_A6 --seq K06=$C/${p}_K06 --seq K07=$C/${p}_K07 --seq K08=$C/${p}_K08 --seq K09=$C/${p}_K09 --seq K10=$(k10 $p) --seq GT=$(gt_of $p) --gt GT --ref BASE --k1 $k1 --stride 2 --out $W/ana/crawl_$p.json > $W/ana/crawl_$p.txt 2>&1
  echo "$(date +%T) crawl $p $(( $(date +%s) - t0 ))s"
}
for p in slow medium reverse; do crawlp $p & done; wait
for p in fast diag leave; do crawlp $p & done
( t0=$(date +%s)
  nice -n 10 node $T/kerr.mjs $SP/work5/aa5b/caps/medium_bmask $G/medium_gt 0 240 A6=$C/medium_A6 K06=$C/medium_K06 K07=$C/medium_K07 K08=$C/medium_K08 K09=$C/medium_K09 K10=$MO/medium_A7 > $W/ana/kerr_medium.txt 2>&1
  nice -n 10 node $T/kerr.mjs $RC/rest_bmask $SP/work5/aa5b/caps/rest_gt 0 40 A6=$C/rest_A6 K06=$C/rest_K06 K07=$C/rest_K07 K08=$C/rest_K08 K09=$C/rest_K09 K10=$C/rest_K10 > $W/ana/kerr_rest.txt 2>&1
  echo "$(date +%T) kerr $(( $(date +%s) - t0 ))s" ) &
( nice -n 10 node $T/mo/j48loc.mjs $A5/slow_mask WR 48 1 159 2 BASE=$G/slow_base A6=$C/slow_A6 K06=$C/slow_K06 K07=$C/slow_K07 K08=$C/slow_K08 K09=$C/slow_K09 K10=$C/slow_K10 GT=$G/slow_gt > $W/ana/j48loc_slow_WR.txt 2>&1; echo "$(date +%T) j48loc" ) &
wait
echo "$(date +%T) anaK end"
