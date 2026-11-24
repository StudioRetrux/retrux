#!/bin/zsh
# judge-motion: knee effect on G1 = AA7 vs AA6 (judge-artrefl's AA6 caps, APFS-cloned, same cap.mjs format) on slow / diag / leave / medium
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work7/motion; T=$W/tools; A5=$SP/work5/aa5a/caps; G=$SP/work3/aa3/caps; RC=$SP/work6/refl/caps; AR=$SP/work7/artrefl/caps
for p in slow diag leave medium; do
  until [[ -f $AR/${p}_A6/meta.json ]]; do sleep 5; done; sleep 3
  [[ -d $W/caps/${p}_A6 ]] || cp -c -R $AR/${p}_A6 $W/caps/${p}_A6
  gt=$G/${p}_gt; [[ $p == diag || $p == leave ]] && gt=$RC/${p}_gt
  k1=119; [[ $p == medium ]] && k1=239; [[ $p == slow ]] && k1=159
  until [[ -f $W/caps/${p}_A7/meta.json ]]; do sleep 4; done
  nice -n 10 node $T/crawl.mjs --mask $A5/${p}_mask --seq BASE=$G/${p}_base --seq AA6=$W/caps/${p}_A6 --seq AA7=$W/caps/${p}_A7 --seq GT=$gt --gt GT --ref BASE --k1 $k1 --stride 2 --out $W/ana/crawlK_$p.json > $W/ana/crawlK_$p.txt 2>&1
  echo "$(date +%T) crawlK $p" >> $W/logs/anaK.out
done
