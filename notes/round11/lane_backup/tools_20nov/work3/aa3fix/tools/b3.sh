#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
F=$SP/work3/aa3fix; A=$SP/work3/judge/artifacts
CAP=$SP/work3/aa3/tools/cap.mjs
t0=$(date +%s); cd $A && node tools/jcap.mjs --case holdre --out $F/caps/holdre --variants "lane:5181"; echo "[b3] holdre $(( $(date +%s) - t0 )) s"
t0=$(date +%s); node $CAP --port 5181 --out $F/caps/m_far3 --path medium --frames 240 --rows 380,766 --qs "lktaafar=3"; echo "[b3] m_far3 $(( $(date +%s) - t0 )) s"
t0=$(date +%s); node $CAP --port 5181 --out $F/caps/m_w65 --path medium --frames 240 --rows 380,766 --qs "lktaaw=0.65"; echo "[b3] m_w65 $(( $(date +%s) - t0 )) s"
t0=$(date +%s); cd $A && node tools/jcap.mjs --case gov --out $F/caps/gov --variants "lane:5181"; echo "[b3] gov $(( $(date +%s) - t0 )) s"
