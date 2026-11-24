#!/bin/zsh
F=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3fix
CAP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3/tools/cap.mjs
for m in 10 8 7 11; do
  node $CAP --port 5181 --out $F/caps/d$m --path reverse --frames 52 --rows 460,560 --qs "lkhalf=0&aaresolve=0" --eval "__hero.water.material.uniforms.uLakeDebug.value = $m"
done
node $CAP --port 5181 --out $F/caps/d0 --path reverse --frames 52 --rows 460,560 --qs "lkhalf=0&aaresolve=0"
