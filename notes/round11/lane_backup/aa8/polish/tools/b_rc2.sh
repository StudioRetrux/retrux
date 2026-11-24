#!/bin/zsh
# AA8 polish RC-2: fix B (render scale 0.7) vs ?mrows=0 in the real loop, unthrottled Chrome, interleaved AB / BA, 8 move + 4 rest
# cycles; first wait (max 150 s) for no other slot holder and a 1-min load < 8; every block records its load (pairs < 10 count).
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=$SP/work8/polish; T=$W/tools
node $T/waitq.mjs 8 150000
node $T/rc2.mjs --vw 1440 --vh 766 --cycles 8 --restcycles 4 --blockms 2500 --confs "fixB=5199|tier=T1&scale=0.7,mr0=5199|tier=T1&scale=0.7&mrows=0" --out $W/perf/rc2.json
