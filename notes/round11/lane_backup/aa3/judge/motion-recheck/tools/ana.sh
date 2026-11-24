#!/bin/zsh
# usage: ana.sh <path>   crawl (G1) + judge (G1b/G6) of base / judged AA3 / fixed AA3 / GT on one path
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/motion; R=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/motion-recheck; G=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3/caps
p=$1
gt=""
[[ $p == slow ]] && gt="--seq gt=$G/slow_gt"
[[ $p == medium ]] && gt="--seq gt=$G/medium_gt"
[[ $p == reverse ]] && gt="--seq gt=$J/caps/gt_reverse"
gtn=""; [[ -n "$gt" ]] && gtn="--gt gt"
t0=$(date +%s)
nice -n 10 node $J/tools/crawl.mjs --mask $J/caps/base_$p --seq base=$J/caps/base_$p --seq judged=$J/caps/aa3_$p --seq fix=$R/caps/fix_$p ${=gt} --ref base ${=gtn} --out $R/ana/crawl_$p.json > $R/ana/crawl_$p.txt 2>&1
echo "[ana] crawl $p $(( $(date +%s) - t0 )) s"
if [[ -n "$gt" ]]; then
  t0=$(date +%s)
  nice -n 10 node $J/tools/judge.mjs --mask $J/caps/base_$p --seq base=$J/caps/base_$p --seq judged=$J/caps/aa3_$p --seq fix=$R/caps/fix_$p ${=gt} --ref base ${=gtn} --out $R/ana/judge_$p.json > $R/ana/judge_$p.txt 2>&1
  echo "[ana] judge $p $(( $(date +%s) - t0 )) s"
fi
