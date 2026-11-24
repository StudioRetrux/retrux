#!/bin/zsh
# F2 fixer: temporal stability (12 frames of 1/60 s, engine loop off) lane :5176 vs MAIN :5173, open hold p05 (3.3), hidden p06 (n), release p07 (3.3)
O=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4orb3/fix/caps/flk
node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4orb3/tools/flk.mjs --port 5176 --tag lane --out $O --pose p05 --tau 3.3 --k 12
node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4orb3/tools/flk.mjs --port 5173 --tag main --out $O --pose p05 --tau 3.3 --k 12
node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4orb3/tools/flk.mjs --port 5176 --tag lane --out $O --pose p06 --tau n --k 12
node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4orb3/tools/flk.mjs --port 5173 --tag main --out $O --pose p06 --tau n --k 12
node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4orb3/tools/flk.mjs --port 5176 --tag lane --out $O --pose p07 --tau 3.3 --k 12
node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4orb3/tools/flk.mjs --port 5173 --tag main --out $O --pose p07 --tau 3.3 --k 12
