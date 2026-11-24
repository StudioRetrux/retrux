#!/bin/zsh
# wl2g: same-pose stepped captures (fast path) for the WL-RJ1 sheet and blips: DPR 1 and 2; M = :5162, L = :5163, G = lane :5164
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
W=$SP/work_p4/wl2g; S=$SP/slot/slot.mjs; T=$W/tools; O=$W/st; N=${N:-120}
C() { local tag=$1; shift; node $S run "wl2g:st-$tag" -- node $T/cap.mjs --tier T1 --path fast --frames $N "$@" --out $O/$tag > $O/$tag.log 2>&1; echo "$(date +%T) $tag $(tail -1 $O/$tag.log | cut -c1-100)" >> $O/run.log; }
C d1_G --port 5164 --rows 380,766
C d1_M --port 5162 --rows 380,766
C d1_L --port 5163 --rows 380,766
C d1_PX --port 5163 --rows 380,766 --qs wlwalk=px
C d2_G --port 5164 --rows 380,766 --dsf 2
C d2_M --port 5162 --rows 380,766 --dsf 2
C d2_L --port 5163 --rows 380,766 --dsf 2
C d2_PX --port 5163 --rows 380,766 --dsf 2 --qs wlwalk=px
for g in gtpx:5163:wlwalk=px\&lkmeach=1 gtown:5164:lkmeach=1; do tag=${g%%:*}; r=${g#*:}; port=${r%%:*}; q=${r#*:}
  node $S run "wl2g:st-$tag" -- zsh -c "node $T/cap.mjs --tier T1 --path fast --frames $N --port $port --vw 2880 --vh 1532 --rows 380,766,766 --qs '$q' --out $O/${tag}2x > $O/$tag.log 2>&1 && node $T/down2.mjs $O/${tag}2x $O/d1_$tag >> $O/$tag.log 2>&1"
  echo "$(date +%T) $tag $(tail -1 $O/$tag.log | cut -c1-100)" >> $O/run.log
done
echo STDONE >> $O/run.log
