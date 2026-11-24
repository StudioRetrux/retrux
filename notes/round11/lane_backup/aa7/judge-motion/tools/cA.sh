#!/bin/zsh
# judge-motion (final, after reboot) chain A: AA7 six G1 paths, AA6 reverse/fast (look), AA7 raw fast (L5 1x rim), then real loop + hitch
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/motion; T=$W/tools; S=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/slot/slot.mjs; C=$W/caps; L=$W/logs
b() { local lab=$1; shift; node $S run "judge-motion $lab" -- zsh -c "$*" >> $L/cA.out 2>&1; echo "$(date +%T) $lab done" >> $L/cA.out; }
b A1 "node $T/cap.mjs --port 5197 --path medium --rows 380,766 --frames 240 --out $C/medium_A7 > $L/A1m.log 2>&1; node $T/cap.mjs --port 5197 --path slow --rows 380,766 --frames 160 --out $C/slow_A7 > $L/A1s.log 2>&1"
b A2 "for p in reverse fast diag leave; do node $T/cap.mjs --port 5197 --path \$p --rows 380,766 --frames 120 --out $C/\${p}_A7 > $L/A2_\$p.log 2>&1; done"
b A3 "node $T/cap.mjs --port 5196 --path reverse --rows 380,766 --frames 120 --out $C/reverse_A6 > $L/A3r.log 2>&1; node $T/cap.mjs --port 5196 --path fast --rows 380,766 --frames 120 --out $C/fast_A6 > $L/A3f.log 2>&1; node $T/cap.mjs --port 5197 --path fast --rows 380,766 --frames 120 --qs envedge=0 --out $C/fast_A7raw > $L/A3x.log 2>&1"
b A4 "node $T/rl.mjs --port 5197 --out $C/rl_medium_A7 --path medium --frames 180 > $L/A4a.log 2>&1; node $T/rl.mjs --port 5182 --out $C/rl_medium_base --path medium --frames 180 > $L/A4b.log 2>&1"
b A5 "SLOT_BG=0 node $T/hitch.mjs --runs a7=5197,base=5182 --reps 1 --rest 8000 --out $W/ana/hitch.json > $L/A5.log 2>&1"
echo "$(date +%T) cA end" >> $L/cA.out
