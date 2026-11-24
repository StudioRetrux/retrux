#!/bin/zsh
export LAB=http://localhost:5177
for i in 1 2; do
QS="" node /Users/muhamadrifaldi/RetruxR11Work/hp/validate/shoot_qc.mjs /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4water/fix/ab_w1/def$i T1 1 q00,q03 > /dev/null 2>&1
QS="p4water=0" node /Users/muhamadrifaldi/RetruxR11Work/hp/validate/shoot_qc.mjs /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4water/fix/ab_w1/off$i T1 1 q00,q03 > /dev/null 2>&1
done
echo "ab_w1 done $(date +%T)"
