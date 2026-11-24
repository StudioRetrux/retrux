#!/bin/zsh
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/motion; T=$W/tools; S=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/slot/slot.mjs; C=$W/caps; L=$W/logs
b() { local lab=$1; shift; node $S run "judge8-motion $lab" -- zsh -c "$*" >> $L/cM3.out 2>&1; echo "$(date +%T) $lab done" >> $L/cM3.out; }
V4="a8:5199,a7:5197,g0:5199:lkglide=0,base:5182:mask"
b E1 "node $T/jcap.mjs --case holdre --rows 380,766 --out $C/holdre --variants '$V4' > $L/E1.log 2>&1"
b E2 "node $T/jcap.mjs --case fastrev --rows 380,766 --out $C/fastrev --variants '$V4' > $L/E2.log 2>&1"
b E3 "node $T/jcap.mjs --case pump --rows 380,766 --out $C/pump --variants '$V4' > $L/E3.log 2>&1"
b R1 "node $T/rl.mjs --port 5199 --out $C/rl_medium_A8 --path medium --frames 180 > $L/R1a.log 2>&1; node $T/rl.mjs --port 5197 --out $C/rl_medium_A7 --path medium --frames 180 > $L/R1b.log 2>&1; node $T/rl.mjs --port 5182 --out $C/rl_medium_base --path medium --frames 180 > $L/R1c.log 2>&1"
SLOT_BG=0 b H1 "SLOT_BG=0 node $T/hitch.mjs --runs a8=5199,a7=5197,base=5182 --reps 1 --rest 8000 --out $W/ana/hitch.json > $L/H1.log 2>&1"
echo "$(date +%T) cM3 end" >> $L/cM3.out
