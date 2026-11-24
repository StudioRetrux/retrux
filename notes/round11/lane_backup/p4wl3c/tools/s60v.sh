#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
C=$SP/work_p4/wl3c; S=$SP/slot/slot.mjs; T=$C/tools; cd $C
for v in g0:wl3cg=0 g2e3:wl3cg=0.002 e0:wl3ae=0 s0:wl3as=0 a0:wl3a=0; do tag=${v%%:*}; qs=${v#*:}
  node $S run "wl3c:s60v" -- zsh -c "LAB=http://localhost:5169 QS='$qs' TIER=T1 PREFIX=s CLIP=860,420,580,200 node $T/shoot_ripple.mjs s60/far_$tag 40 0.0166666667 100 > s60/far_$tag.log 2>&1" &
done; wait; echo "$(date +%T) s60v done" >> run.log
