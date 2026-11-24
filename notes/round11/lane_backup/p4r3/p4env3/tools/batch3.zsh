#!/bin/zsh
W=$1; cd $W
node $W/tools/zig2.mjs 5174 $W/zig2_fin.json > /dev/null 2>&1; echo "zig2 fin $(date +%T)"
node $W/tools/zig2.mjs 5174 $W/zig2_nocrack.json p4crack=0 > /dev/null 2>&1; echo "zig2 nocrack $(date +%T)"
zsh $W/tools/ab.zsh $W/ab3 5174 'fin=' 'nocrack=p4crack=0'
