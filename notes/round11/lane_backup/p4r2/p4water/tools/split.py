import json, sys, statistics as st
d = json.load(open(sys.argv[1])); mode = sys.argv[2] if len(sys.argv) > 2 else "hold"
bl = [b for b in d["blocks"] if b["mode"] == mode]
names = []
for b in bl:
    if b["name"] not in names: names.append(b["name"])
by = {n: [b for b in bl if b["name"] == n] for n in names}
med = lambda a: st.median(a)
print("mode", mode, "boot", d["boot"], "secs", d["secs"], "logs", d["logs"][:2])
for n in names:
    ms = [med(b["iv"]) for b in by[n]]
    print(f"{n:8s} blockMeds {[round(x,2) for x in ms]} med {med(ms):.2f} loads {[b['load'] for b in by[n]]}")
ref = sys.argv[3] if len(sys.argv) > 3 else names[0]
for n in names:
    if n == ref: continue
    r = [med(a["iv"]) / med(b["iv"]) for a, b in zip(by[n], by[ref])]
    dm = [med(a["iv"]) - med(b["iv"]) for a, b in zip(by[n], by[ref])]
    print(f"{n:8s} vs {ref}: paired ratio med {med(r):.3f}  [{', '.join(f'{x:.3f}' for x in r)}]  ms diff med {med(dm):+.2f}")
