#!/bin/zsh
# ab.zsh <outRoot> <port> <name=qs> ...   (FILTER env passes through to shots.mjs)
out=$1; port=$2; shift 2
for v in "$@"; do
  name=${v%%=*}; qs=${v#*=}
  node ${0:a:h}/shots.mjs $port $out/$name "$qs" > $out/$name.log 2>&1
  echo "$name done $(date +%T) $(grep -c ERROR $out/$name/log.txt) errors"
done
