#!/bin/zsh
J=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4water
run() { node $J/tools/identS.mjs "$@" > /dev/null 2>> $J/logs/ident.err; echo "$(date +%T) done $*" >> $J/logs/ident.log; }
run --port 5199 --pre "__hero.debug.pose('expand', 2.97)" --out $J/ident/m_hold.json
run --port 5177 --pre "__hero.debug.pose('expand', 2.97)" --out $J/ident/l_def_hold.json
run --port 5177 --mobile --out $J/ident/l_t0.json
run --port 5199 --mobile --out $J/ident/m_t0.json
