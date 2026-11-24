#!/bin/zsh
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/artifacts-recheck; O=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/artifacts/caps; T=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/artifacts/tools
node $T/jana.mjs --base $O/gov/base --lane caps/gov/lane --off caps/gov/off --out ana/gov.json > ana/gov.txt 2>&1 &
node tools/jg4s.mjs caps/gov/lane caps/gov/off > ana/gov_g4s.txt 2>&1 &
node tools/jg4s.mjs $O/gov/lane $O/gov/off > ana/gov_g4s_judged.txt 2>&1 &
node $T/jana.mjs --base $O/fastrev/base --lane caps/fastrev/lane --off caps/fastrev/off --out ana/fastrev.json > ana/fastrev.txt 2>&1 &
node $T/jab.mjs $O/fastrev/base caps/fastrev/lane caps/fastrev/off > ana/A3_fastrev_jab.txt 2>&1 &
wait
node tools/jsame.mjs $O/gov/lane caps/gov/lane > ana/gov_same.txt; node tools/jsame.mjs $O/gov/off caps/gov/off >> ana/gov_same.txt
node tools/jsame.mjs $O/fastrev/off caps/fastrev/off > ana/fastrev_same.txt
echo ANA-R2-DONE
