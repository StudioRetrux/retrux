#!/bin/zsh
F=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3fix
CAP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3/tools/cap.mjs
c() { local n=$1 p=$2 fr=$3 q=$4; local t0=$(date +%s); if [[ -n "$q" ]]; then node $CAP --port 5181 --out $F/caps/$n --path $p --frames $fr --rows 380,766 --qs "$q"; else node $CAP --port 5181 --out $F/caps/$n --path $p --frames $fr --rows 380,766; fi; echo "[b2] $n $(( $(date +%s) - t0 )) s"; }
c m_new medium 240 ""
c m_clip0 medium 240 "lktaaclip=0"
c m_refl0 medium 240 "lktaarefl=0"
c r_hmin0 reverse 56 "lkhmin=0"
c r_haz0 reverse 56 "lkhaz=0"
c r_dofk0 reverse 56 "lkdofk=0"
