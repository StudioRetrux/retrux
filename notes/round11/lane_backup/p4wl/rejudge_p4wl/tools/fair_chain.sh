#!/bin/zsh
# rejudge_p4wl: FAIR gate at T1 (client tier), fast + reverse, one build ($1 port, $2 tag), each vs its OWN 16-sample GT
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
J=$SP/work_p4/judge_p4wl; R=$SP/work_p4/rejudge_p4wl; S=$SP/slot/slot.mjs; G=$SP/work_p4/gt_new/tools; F=$R/fair
port=$1; b=$2
for p in fast reverse; do n=240; [ $p = fast ] && n=120
  node $S run "rejudge_p4wl:fair-$p-$b-cap" -- zsh -c "cd $J; node tools/pop/cap.mjs --port $port --tier T1 --path $p --rows 380,766 --frames 240 --out $F/${p}_$b > $F/${p}_$b.log 2>&1"
  node $S run "rejudge_p4wl:fair-$p-$b-gt" -- zsh -c "cd $G; node cap.mjs --port $port --tier T1 --path $p --frames $n --vw 2880 --vh 1532 --rows 380,766,766 --qs lkmeach=1 --out $F/${p}_${b}_gt2x > $F/${p}_${b}_gt.log 2>&1 && node down2.mjs $F/${p}_${b}_gt2x $F/${p}_${b}_gt && rm -rf $F/${p}_${b}_gt2x"
  echo "$(date +%T) fair $p $b done" >> $F/run.log
done
echo "DONE_$b" >> $F/run.log
