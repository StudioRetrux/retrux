#!/bin/zsh
# judge-motion: event analysis per jcap case as it lands (evt a7 vs g0 / a6 with BASE mask, stepcnt, sharp2)
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/motion; T=$W/tools; C=$W/caps; A=$W/ana
wv() { local d=$1; shift; for v in "$@"; do until [[ -f $C/$d/$v/meta.json ]]; do sleep 5; done; done; }
cd $T
ev() { # case vars...
  local c=$1; shift
  nice -n 10 node evt.mjs $C/$c --a a7 --b a6 --m base > $A/evt_${c}_a7a6.txt 2>&1
  if [[ -d $C/$c/g0 ]]; then nice -n 10 node evt.mjs $C/$c --a a7 --b g0 --m base > $A/evt_${c}_a7g0.txt 2>&1; fi
  echo "$(date +%T) evt $c" >> $W/logs/anaEV.out
}
wv fastrev a7 g0 a6 base; ev fastrev
nice -n 10 node stepcnt.mjs $C/fastrev a7,g0,a6,base 1 8 > $A/stepcnt_fastrev.txt 2>&1; nice -n 10 node stepcnt.mjs $C/fastrev a7,g0,a6,base 36 46 >> $A/stepcnt_fastrev.txt 2>&1; nice -n 10 node stepcnt.mjs $C/fastrev a7,g0,a6,base 66 100 >> $A/stepcnt_fastrev.txt 2>&1
wv holdre a7 g0 a6 base; ev holdre
nice -n 10 node stepcnt.mjs $C/holdre a7,g0,a6,base 1 24 > $A/stepcnt_holdre.txt 2>&1; nice -n 10 node stepcnt.mjs $C/holdre a7,g0,a6,base 106 150 >> $A/stepcnt_holdre.txt 2>&1; nice -n 10 node stepcnt.mjs $C/holdre a7,g0,a6,base 210 239 >> $A/stepcnt_holdre.txt 2>&1
nice -n 10 node sharp2.mjs $C/holdre a7,g0,a6,base --print ALL,FS,RS > $A/sharp_holdre.txt 2>&1
wv leavere a7 g0 a6 base; ev leavere
nice -n 10 node stepcnt.mjs $C/leavere a7,g0,a6,base 1 8 > $A/stepcnt_leavere.txt 2>&1; nice -n 10 node stepcnt.mjs $C/leavere a7,g0,a6,base 36 46 >> $A/stepcnt_leavere.txt 2>&1; nice -n 10 node stepcnt.mjs $C/leavere a7,g0,a6,base 76 90 >> $A/stepcnt_leavere.txt 2>&1
wv gov a7 a6 base; ev gov
nice -n 10 node stepcnt.mjs $C/gov a7,a6,base 22 30 > $A/stepcnt_gov.txt 2>&1; nice -n 10 node stepcnt.mjs $C/gov a7,a6,base 98 108 >> $A/stepcnt_gov.txt 2>&1
wv pump a7 g0 a6 base; ev pump
nice -n 10 node stepcnt.mjs $C/pump a7,g0,a6,base 1 8 > $A/stepcnt_pump.txt 2>&1; nice -n 10 node stepcnt.mjs $C/pump a7,g0,a6,base 66 110 >> $A/stepcnt_pump.txt 2>&1; nice -n 10 node stepcnt.mjs $C/pump a7,g0,a6,base 186 200 >> $A/stepcnt_pump.txt 2>&1
nice -n 10 node sharp2.mjs $C/pump a7,g0,a6,base --print ALL,FS,RS > $A/sharp_pump.txt 2>&1
echo "$(date +%T) anaEV main done" >> $W/logs/anaEV.out
