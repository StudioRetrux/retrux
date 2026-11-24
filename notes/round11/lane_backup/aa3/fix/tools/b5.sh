#!/bin/zsh
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; F=$SP/work3/aa3fix; CAP=$SP/work3/aa3/tools/cap.mjs
node $CAP --port 5181 --out $F/caps/r_hmin10 --path reverse --frames 56 --rows 380,766 --qs "lkhmin=0.1"
node $CAP --port 5181 --out $F/caps/r_hmin20 --path reverse --frames 56 --rows 380,766 --qs "lkhmin=0.2"
node $CAP --port 5181 --out $F/caps/m_final60 --path medium --frames 60 --rows 380,766
node $CAP --port 5181 --out $F/caps/slow_final --path slow --frames 240 --rows 380,766
