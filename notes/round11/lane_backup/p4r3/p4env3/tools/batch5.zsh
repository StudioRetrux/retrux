#!/bin/zsh
W=$1; cd $W
node $W/tools/zig2.mjs 5174 $W/zig2_fin5.json > /dev/null 2>&1; echo "zig2 fin5 $(date +%T)"
zsh $W/tools/ab.zsh $W/ab3 5174 'fin='
