#!/bin/zsh
# p4hold ident batch I2: hold poses (debug pose before identS's settle; 20 moving frames at the pose)
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4hold
cd $W
I() { node tools/identS.mjs "$@" }
P04='(()=>{const h=window.__hero;h.debug.pose("expand",0);h.debug.settle(0.1);h.debug.pose("expand",0.9);})()'
P06='(()=>{const h=window.__hero;h.debug.pose("expand",0);h.debug.settle(0.1);h.debug.pose("expand",2.97);})()'
P07='(()=>{const h=window.__hero;h.debug.pose("release",0.33);})()'
for nm in p04 p06; do
  PRE=$P04; [ $nm = p06 ] && PRE=$P06
  I --port 5199 --pre "$PRE" --out ident/m_$nm.json > /dev/null
  I --port 5178 --qs p4hold=0 --pre "$PRE" --out ident/off_$nm.json > /dev/null
  I --port 5178 --qs holdcam=r11\&holdpop=r11 --pre "$PRE" --out ident/sub_$nm.json > /dev/null
  I --port 5178 --pre "$PRE" --out ident/lane_$nm.json > /dev/null
done
I --port 5199 --mobile --pre "$P06" --out ident/m_T0_p06.json > /dev/null
I --port 5178 --mobile --qs p4hold=0 --pre "$P06" --out ident/off_T0_p06.json > /dev/null
I --port 5199 --pre "$P07" --out ident/m_p07.json > /dev/null
I --port 5178 --qs p4hold=0 --pre "$P07" --out ident/off_p07.json > /dev/null
I --port 5199 --tier T2 --pre "$P06" --out ident/m_T2_p06.json > /dev/null
I --port 5178 --tier T2 --qs p4hold=0 --pre "$P06" --out ident/off_T2_p06.json > /dev/null
I --port 5199 --qs envlake=plate --pre "$P06" --out ident/m_plate_p06.json > /dev/null
I --port 5178 --qs envlake=plate\&p4hold=0 --pre "$P06" --out ident/off_plate_p06.json > /dev/null
echo I2 done
