#!/bin/zsh
# wl3a: restart lab :5169 (only the process serving :5169 from LANES/wl3a)
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad
pid=$(lsof -nP -iTCP:5169 -sTCP:LISTEN -t); if [[ -n "$pid" ]]; then cwd=$(lsof -a -p $pid -d cwd -Fn | grep ^n | cut -c2-); [[ "$cwd" == *lanes/wl3a/retrux-web* ]] && kill $pid || { echo "5169 not ours: $cwd"; exit 1; }; fi
sleep 1; cd /Users/muhamadrifaldi/RetruxR11Work/lanes/wl3a/retrux-web && PORT=5169 nohup node hero-lab/serve.mjs --no-watch > $SP/work_p4/wl3a/lab.log 2>&1 &
for i in {1..60}; do sleep 1; grep -q "serving" $SP/work_p4/wl3a/lab.log && break; grep -qi "error" $SP/work_p4/wl3a/lab.log && break; done; cat $SP/work_p4/wl3a/lab.log | head -5
