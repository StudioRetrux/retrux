#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
J=$SP/work_p4/judge_p4wl; R=$SP/work_p4/rejudge_p4wl; S=$SP/slot/slot.mjs
node $S run 'rejudge_p4wl:t2step' -- zsh -c "cd $J
node tools/pop/cap.mjs --port 5162 --tier T2 --path fast --rows 380,766 --frames 120 --out $R/fair/t2fast_M > $R/fair/t2fast_M.log 2>&1
node tools/pop/cap.mjs --port 5163 --tier T2 --path fast --rows 380,766 --frames 120 --out $R/fair/t2fast_L > $R/fair/t2fast_L.log 2>&1"
echo T2DONE >> $R/fair/run.log
