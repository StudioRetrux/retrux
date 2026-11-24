#!/bin/zsh
# G7 exclusive window, taken AFTER this job holds a slot (the 9-deep priority queue made a queued-under-n:1 window a lottery):
# n:1 from now (no new holder can enter while this holds slot 0; holders already running drain), quiet wait, timing, restore.
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/perfcode
C=../../slot/.slot-conf.json
U=$(date -v+20M +%Y-%m-%dT%H:%M:%S+07:00)
printf '{"n":1,"loadMax":1,"bg":false,"until":"%s","why":"perfcode exclusive timing (unthrottled rAF run; loadMax 1 shuts every slot while it holds one)"}\n' "$U" > $C
date; uptime; cat ../../slot/.slot*/owner.json 2>/dev/null; echo
node tools/waitquiet.mjs 10 360000
uptime
SLOT_BG=0 node tools/rtxu.mjs --vw 1440 --vh 766 --cycles 8 --restcycles 8 --blockms 2000 --restsettle 2600 --out perf/rtxu_1440.json > perf/rtxu_1440.out 2>&1
date; uptime; cat ../../slot/.slot*/owner.json 2>/dev/null; echo
printf '{"n":3,"loadMax":30,"bg":false}\n' > $C
cat $C
