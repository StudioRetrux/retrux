#!/bin/zsh
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5c
cd $W
for p in slow:72 reverse:120 leave:180; do n=${p%%:*}; f=${p##*:};
  node tools/ident2.mjs --port 5195 --path $n --frames $f --out ident/lane_$n.json
  node tools/ident2.mjs --port 5195 --path $n --frames $f --qs "mirrorcost=0" --out ident/lane_mc0_$n.json
done
