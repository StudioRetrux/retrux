#!/bin/zsh
# AA8 polish: the hold path (the knee also acts where the TAA does not run: the hold's crest train) at knee 0.6 (final :5199) and
# AA6 (:5196, 0.5): cap.mjs hold 420 frames rows 380-766 = the art judge's AR hold capture
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/polish; T=$W/tools; t0=$(date +%s)
node $T/fx/cap.mjs --port 5199 --path hold --frames 420 --rows 380,766 --out $W/caps/hold_FINAL; echo "hold FINAL $(( $(date +%s) - t0 ))s"
node $T/fx/cap.mjs --port 5196 --path hold --frames 420 --rows 380,766 --out $W/caps/hold_A6; echo "hold A6 $(( $(date +%s) - t0 ))s"
