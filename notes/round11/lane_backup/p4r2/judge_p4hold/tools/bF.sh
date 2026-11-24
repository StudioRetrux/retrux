#!/bin/zsh
# judge_p4hold batch F: older-build switches stay exact in the lane default (Q12/Q13 gated on P2B_F2)
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4hold
cd $J
I() { node tools/identS.mjs "$@" }
P04='(()=>{const h=window.__hero;h.debug.pose("expand",0);h.debug.settle(0.1);h.debug.pose("expand",0.9);})()'
P06='(()=>{const h=window.__hero;h.debug.pose("expand",0);h.debug.settle(0.1);h.debug.pose("expand",2.97);})()'
I --port 5199 --qs hold=r10 --pre "$P06" --out ident/m_r10_p06.json > /dev/null
I --port 5178 --qs hold=r10 --pre "$P06" --out ident/lane_r10_p06.json > /dev/null
I --port 5199 --qs spin=f1 --pre "$P04" --out ident/m_f1_p04.json > /dev/null
I --port 5178 --qs spin=f1 --pre "$P04" --out ident/lane_f1_p04.json > /dev/null
echo F done
