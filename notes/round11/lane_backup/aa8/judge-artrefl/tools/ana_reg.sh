#!/bin/bash
# regerr per path: band / lake / solid error vs GT, beyond GT&BASE counts (A7, A6, FIX1, BASE)
source /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/artrefl/tools/paths.sh
p=$1; cd $W/tools; M=$(mask_of $p); G=$(gt_of $p); F=$(fix_of $p); B=$(base_of $p)
node regerr.mjs --mask $M --gt $G --base $B --r 3 --t 12 ${2:+--k1 $2} BASE=$B A7=$W/caps/${p}_A7 A6=$W/caps/${p}_A6 FIX1=$F > $W/ana/regerr_$p.txt 2>&1
echo done reg $p
