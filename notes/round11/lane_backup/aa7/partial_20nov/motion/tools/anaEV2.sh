#!/bin/zsh
# judge-motion: event analysis per jcap case as it lands (evt A vs B with BASE mask band, stepcnt, sharp2, l5g4)
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/motion; T=$W/tools; C=$W/caps; A=$W/ana
wv() { local d=$1; shift; for v in "$@"; do until [[ -f $C/$d/$v/meta.json ]]; do sleep 5; done; done; }
cd $T
ev() { nice -n 10 node evt.mjs $C/$1 --a $2 --b $3 --m base ${4:+--seg $4} > $A/evt_$1${4}_$2$3.txt 2>&1; echo "$(date +%T) evt $1$4 $2 vs $3" >> $W/logs/anaEV.out; }
wv holdre a7 g0 base; ev holdre a7 g0; ev holdre a7 base
nice -n 10 node stepcnt.mjs $C/holdre a7,g0,base 1 24 > $A/stepcnt_holdre.txt 2>&1; nice -n 10 node stepcnt.mjs $C/holdre a7,g0,base 106 150 >> $A/stepcnt_holdre.txt 2>&1; nice -n 10 node stepcnt.mjs $C/holdre a7,g0,base 210 239 >> $A/stepcnt_holdre.txt 2>&1
nice -n 10 node sharp2.mjs $C/holdre a7,g0,base --print ALL,FS,RS > $A/sharp_holdre.txt 2>&1
wv fastrev a7 g0 a6 base; ev fastrev a7 g0; ev fastrev a7 a6
nice -n 10 node stepcnt.mjs $C/fastrev a7,g0,a6,base 1 8 > $A/stepcnt_fastrev.txt 2>&1; nice -n 10 node stepcnt.mjs $C/fastrev a7,g0,a6,base 36 46 >> $A/stepcnt_fastrev.txt 2>&1; nice -n 10 node stepcnt.mjs $C/fastrev a7,g0,a6,base 66 119 >> $A/stepcnt_fastrev.txt 2>&1
wv pump a7 g0 base; ev pump a7 g0; ev pump a7 base
nice -n 10 node stepcnt.mjs $C/pump a7,g0,base 1 8 > $A/stepcnt_pump.txt 2>&1; nice -n 10 node stepcnt.mjs $C/pump a7,g0,base 66 110 >> $A/stepcnt_pump.txt 2>&1; nice -n 10 node stepcnt.mjs $C/pump a7,g0,base 186 200 >> $A/stepcnt_pump.txt 2>&1
nice -n 10 node sharp2.mjs $C/pump a7,g0,base --print ALL,FS,RS > $A/sharp_pump.txt 2>&1
wv leavere a7 g0 base; ev leavere a7 g0; ev leavere a7 base
nice -n 10 node stepcnt.mjs $C/leavere a7,g0,base 1 8 > $A/stepcnt_leavere.txt 2>&1; nice -n 10 node stepcnt.mjs $C/leavere a7,g0,base 36 46 >> $A/stepcnt_leavere.txt 2>&1; nice -n 10 node stepcnt.mjs $C/leavere a7,g0,base 76 90 >> $A/stepcnt_leavere.txt 2>&1
until [[ -f $C/resize/base_s2/meta.json ]]; do sleep 5; done; ev resize a7 base; ev resize a7 base _s1; ev resize a7 base _s2
wv gov a7 a6 base; ev gov a7 a6; ev gov a7 base
nice -n 10 node stepcnt.mjs $C/gov a7,a6,base 22 30 > $A/stepcnt_gov.txt 2>&1; nice -n 10 node stepcnt.mjs $C/gov a7,a6,base 98 108 >> $A/stepcnt_gov.txt 2>&1
wv tab a7 base; ev tab a7 base
wv dpr2 a7 raw base; ev dpr2 a7 raw; nice -n 10 node l5g4.mjs $C/dpr2/base $C/dpr2/a7 $C/dpr2/raw > $A/l5g4_dpr2.txt 2>&1
echo "$(date +%T) anaEV main done" >> $W/logs/anaEV.out
