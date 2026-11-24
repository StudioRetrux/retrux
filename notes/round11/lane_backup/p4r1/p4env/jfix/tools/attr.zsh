#!/bin/zsh
# attribution batch: zsh attr.zsh <outRoot> <port> <variant=qs> ...
out=$1; port=$2; shift 2
for v in "$@"; do
  name=${v%%=*}; qs=${v#*=}
  FILTER='^(ptr_rest|sw_hold_B|sw_hold_T|sw_hold_L|sw_pop_L|late90_rest)$' node ${0:a:h}/shots.mjs $port $out/$name "$qs" > $out/$name.log 2>&1
  echo "$name done $(date +%T)"
done
