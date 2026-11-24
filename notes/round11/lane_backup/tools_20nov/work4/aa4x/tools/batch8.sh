#!/bin/zsh
# G8 idents (6 sessions) then G7 perf (X7 default vs ?gbaa=0 (AA3) vs BASE :5182), interleaved, 3 pairs, medium 180 frames
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work4/aa4x
zsh tools/g8.sh
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work4/aa4x/tools
SLOT_BG=0 node perf.mjs --runs "X7=5191|,AA3=5191|gbaa=0,BASE=5182|" --pairs 3 --path medium --frames 180 --warm 60 --batch 10 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work4/aa4x/perf/perf_medium_X7.json
