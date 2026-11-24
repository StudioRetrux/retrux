#!/bin/zsh
# judge8-motion: event analysis per jcap case as it lands: evt (a8 vs a7 / g0, BASE mask), stepcnt around starts / stops, sharp2
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/motion; T=$W/tools; C=$W/caps; A=$W/ana
wv() { local d=$1; shift; for v in "$@"; do until [[ -f $C/$d/$v/meta.json ]]; do sleep 5; done; done; sleep 2; }
cd $T
ev() { local c=$1
  nice -n 10 node evt.mjs $C/$c --a a8 --b a7 --m base --json $A/evt_${c}_a8a7.json > $A/evt_${c}_a8a7.txt 2>&1
  nice -n 10 node evt.mjs $C/$c --a a8 --b g0 --m base --json $A/evt_${c}_a8g0.json > $A/evt_${c}_a8g0.txt 2>&1
  echo "$(date +%T) evt $c" >> $W/logs/anaE8.out; }
sc() { local c=$1 v=$2; shift 2; for w in "$@"; do nice -n 10 node stepcnt.mjs $C/$c $v ${w%-*} ${w#*-} >> $A/stepcnt_$c.txt 2>&1; done; }
wv holdre a8 a7 g0 base; ev holdre; sc holdre a8,a7,g0,base 1-24 106-150 210-239; nice -n 10 node sharp2.mjs $C/holdre a8,a7,g0,base --print ALL,FS,RS > $A/sharp_holdre.txt 2>&1; echo "$(date +%T) holdre done" >> $W/logs/anaE8.out
wv fastrev a8 a7 g0 base; ev fastrev; sc fastrev a8,a7,g0,base 1-8 36-46 66-100; nice -n 10 node sharp2.mjs $C/fastrev a8,a7,g0,base --print ALL,FS,RS > $A/sharp_fastrev.txt 2>&1; echo "$(date +%T) fastrev done" >> $W/logs/anaE8.out
wv pump a8 a7 g0 base; ev pump; sc pump a8,a7,g0,base 1-8 66-110 186-200; nice -n 10 node sharp2.mjs $C/pump a8,a7,g0,base --print ALL,FS,RS > $A/sharp_pump.txt 2>&1; echo "$(date +%T) pump done" >> $W/logs/anaE8.out
echo "$(date +%T) anaE8 end" >> $W/logs/anaE8.out
