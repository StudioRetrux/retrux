import json, sys, math
# folded per-frame band change: amplitude (levels) of the k mod P pattern, for P = 2, 3, 4, 8 (k = j + 1)
for f in sys.argv[1:]:
    d = json.load(open(f))
    print("==", f.split("/")[-1])
    for name, r in d["res"].items():
        out = []
        for box in ["ALL", "FF", "FR", "FS", "WR", "DR", "RS"]:
            s = r["series"][box]
            mu = sum(s) / len(s)
            parts = []
            for P in (2, 3, 4, 8):
                g = [[] for _ in range(P)]
                for j, x in enumerate(s):
                    g[(j + 1) % P].append(x)
                m = [sum(a) / len(a) for a in g]
                parts.append(f"{P}:{max(m) - min(m):.3f}")
            out.append(f"{box} mean {mu:.2f} " + " ".join(parts))
        print(f"  {name:5s} " + " | ".join(out[:3]))
        print(f"        " + " | ".join(out[3:]))
