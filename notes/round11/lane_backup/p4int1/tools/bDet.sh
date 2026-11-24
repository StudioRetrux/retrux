#!/bin/zsh
# int1 deterministic qc poses: int1 default / ice only / orb only vs the ice lane :5175 and the orb lane :5176 (same sim state)
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/int1
cd $W
node tools/detq.mjs 5173 det/i > det/i.log 2>&1
node tools/detq.mjs 5173 det/ice_only 'p4env=0&p4orb=0&p4hold=0' > det/ice_only.log 2>&1
node tools/detq.mjs 5173 det/orb_only 'p4env=0&p4ice=0&p4hold=0' > det/orb_only.log 2>&1
node tools/detq.mjs 5175 det/ice_lane > det/ice_lane.log 2>&1
node tools/detq.mjs 5176 det/orb_lane > det/orb_lane.log 2>&1
node tools/detq.mjs 5199 det/main > det/main.log 2>&1
echo DET shots done
LAB=http://localhost:5173 node tools/probe_interact.mjs > ana/interact_int1.txt 2>&1
echo INTERACT done
node tools/ctxlive.mjs --outdir ctx int1=5173 'int1off=5173?p4env=0&p4ice=0&p4orb=0&p4hold=0' > ana/ctxlive_int1.txt 2>&1
echo CTX done
