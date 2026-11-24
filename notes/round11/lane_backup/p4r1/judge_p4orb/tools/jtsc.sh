#!/bin/zsh
cd /Users/muhamadrifaldi/RetruxR11Work/lanes/p4orb/retrux-web || exit 9
npx tsc -p tsconfig.hero.json --noEmit --incremental false; echo "hero tsc exit $?"
npx tsc -p tsconfig.json --noEmit --incremental false; echo "project tsc exit $?"
