#!/bin/zsh
# time slices base | judged AA3 | fixed AA3 | GT (same rows / windows as the first motion judge), M-2 block crops / strips
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/motion; R=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/motion-recheck; G=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3/caps; S=$J/tools/slice.mjs; I=$R/img
sl() { # path box row x0 [gt]
  local p=$1 b=$2 r=$3 x=$4 gt=$5 tag=base_judged_fix
  [[ -n "$gt" ]] && tag=base_judged_fix_gt
  nice -n 10 node $S --out $I/slice_${p}_${b}_r${r}_x${x}_$tag.png --row $r --x0 $x --x1 $((x+100)) --zoom 3 $J/caps/base_$p $J/caps/aa3_$p $R/caps/fix_$p $gt > /dev/null
}
case $1 in
medium)
  sl medium RS 614 1059 $G/medium_gt; sl medium WR 659 1103 $G/medium_gt; sl medium FS 695 291 $G/medium_gt
  sl medium DR 695 350 $G/medium_gt; sl medium FF 501 234 $G/medium_gt; sl medium FR 506 1103 $G/medium_gt
  nice -n 10 node $J/tools/strip.mjs --crop 290,488,360,522 --k0 100 --k1 110 --step 2 --zoom 6 --out $I/strip_medium_FFblock_k100-110_base_judged_fix_gt.png $J/caps/base_medium $J/caps/aa3_medium $R/caps/fix_medium $G/medium_gt > /dev/null
  ;;
slow)
  sl slow RS 614 1061 $G/slow_gt; sl slow WR 654 1110 $G/slow_gt; sl slow FS 692 305 $G/slow_gt
  sl slow DR 752 350 $G/slow_gt; sl slow FF 529 238 $G/slow_gt; sl slow FR 501 1083 $G/slow_gt
  ;;
fast)
  sl fast FS 686 330; sl fast WR 663 1084; sl fast RS 614 1062
  ;;
reverse)
  sl reverse FS 686 330 $J/caps/gt_reverse; sl reverse RS 614 1059 $J/caps/gt_reverse; sl reverse WR 663 1084 $J/caps/gt_reverse
  nice -n 10 node $J/tools/strip.mjs --crop 195,488,285,522 --k0 44 --k1 52 --step 2 --zoom 6 --out $I/strip_reverse_FFblock_k44-52_base_judged_fix_gt.png $J/caps/base_reverse $J/caps/aa3_reverse $R/caps/fix_reverse $J/caps/gt_reverse > /dev/null
  ;;
leave)
  sl leave RS 614 1059; sl leave FF 491 287
  ;;
esac
echo "[imgs] $1 done"
