#!/bin/zsh
# judge chain B: FAIR gate at T2 (lane changes only at T2; T1 default is ident-identical), fast + reverse, each vs its OWN 16-sample GT
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
J=$SP/work_p4/judge_p4wl; S=$SP/slot/slot.mjs; G=$SP/work_p4/gt_new/tools
cd $J; mkdir -p fair
until grep -q RLDONE rl/run.log; do sleep 5; done
for p in fast reverse; do n=240; [ $p = fast ] && n=120
 for q in 5162:M 5163:L; do port=${q%%:*}; b=${q#*:}
  node $S run "judge_p4wl:fair-$p-$b" -- zsh -c "cd $J; node tools/pop/cap.mjs --port $port --tier T2 --path $p --rows 380,766 --frames 240 --out fair/${p}_$b > fair/${p}_$b.log 2>&1; cd $G; node cap.mjs --port $port --tier T2 --path $p --frames $n --vw 2880 --vh 1532 --rows 380,766,766 --qs lkmeach=1 --out $J/fair/${p}_${b}_gt2x > $J/fair/${p}_${b}_gt.log 2>&1 && node down2.mjs $J/fair/${p}_${b}_gt2x $J/fair/${p}_${b}_gt && rm -rf $J/fair/${p}_${b}_gt2x"
  echo "$(date +%T) fair $p $b"
 done
done
echo FAIRCAPDONE > fair/DONE
