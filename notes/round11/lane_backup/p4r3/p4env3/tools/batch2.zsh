#!/bin/zsh
W=$1
cd $W
FILTER='^(late90_rest|late90_right|late150_rest|late150_right)$' zsh $W/tools/ab.zsh $W/ab2 5174 'lf65=p4lumafloor=0.4,0.65' 'nocard=p4card=0' 'base3=' 'r1=p4env3=0'
node $W/tools/zig.mjs 5174 $W/zig > $W/zig.log 2>&1; echo "zig done $(date +%T)"
LAB=http://localhost:5174 node $W/tools/uvprobe.mjs $W/uv_j4j2.json '[["j4_direct","rest",330,467,72,14,2,0],["j4_mirror","rest",330,467,72,14,2,1],["j4_left","rest",300,467,30,14,2,1],["j2_direct","hold_B",1390,731,52,24,2,0],["j2_mirror","hold_B",1390,731,52,24,2,1]]' > $W/uv_j4j2.log 2>&1; echo "uv done $(date +%T)"
