#!/bin/zsh
# judge-motion: event analysis per jcap case as it lands: evt (a7 vs a6 / g0, BASE mask), stepcnt around starts / stops, sharp2
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/motion; T=$W/tools; C=$W/caps; A=$W/ana
wv() { local d=$1; shift; for v in "$@"; do until [[ -f $C/$d/$v/meta.json ]]; do sleep 5; done; done; sleep 2; }
cd $T
ev() { local c=$1; shift
  nice -n 10 node evt.mjs $C/$c --a a7 --b a6 --m base --json $A/evt_${c}_a7a6.json > $A/evt_${c}_a7a6.txt 2>&1
  if [[ -d $C/$c/g0 ]]; then nice -n 10 node evt.mjs $C/$c --a a7 --b g0 --m base --json $A/evt_${c}_a7g0.json > $A/evt_${c}_a7g0.txt 2>&1; fi
  echo "$(date +%T) evt $c" >> $W/logs/anaE.out; }
sc() { local c=$1 v=$2; shift 2; for w in "$@"; do nice -n 10 node stepcnt.mjs $C/$c $v ${w%-*} ${w#*-} >> $A/stepcnt_$c.txt 2>&1; done; }
wv holdre a7 g0 a6 base; ev holdre; sc holdre a7,g0,a6,base 1-24 106-150 210-239; nice -n 10 node sharp2.mjs $C/holdre a7,g0,a6,base --print ALL,FS,RS > $A/sharp_holdre.txt 2>&1; echo "$(date +%T) holdre done" >> $W/logs/anaE.out
wv pump a7 g0 a6 base; ev pump; sc pump a7,g0,a6,base 1-8 66-110 186-200; nice -n 10 node sharp2.mjs $C/pump a7,g0,a6,base --print ALL,FS,RS > $A/sharp_pump.txt 2>&1; echo "$(date +%T) pump done" >> $W/logs/anaE.out
wv fastrev a7 g0 a6 base; ev fastrev; sc fastrev a7,g0,a6,base 1-8 36-46 66-100
wv leavere a7 g0 a6 base; ev leavere; sc leavere a7,g0,a6,base 1-8 36-46 76-90
wv gov a7 g0 a6 base; ev gov; sc gov a7,g0,a6,base 22-30 48-56 73-81 98-108
echo "$(date +%T) anaE main done" >> $W/logs/anaE.out
