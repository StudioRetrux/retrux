import json, sys
d = json.load(open(sys.argv[1]))
fr = d["frames"] if isinstance(d, dict) else d
by = {f["frame"]: f for f in fr}
print("frames:", sorted(by))
for a, b in [(0, 20), (1, 21), (2, 22), (3, 23), (4, 24)]:
    fa, fb = by.get("lf_%02d" % a), by.get("lf_%02d" % b)
    if not fa or not fb: continue
    row = []
    for r in "ABCD":
        x, y = fa["rings"][r], fb["rings"][r]
        row.append("%s %3d/%.2f/%s vs %3d/%.2f/%s" % (r, x["theta"], x["ratio"], x["near"][0], y["theta"], y["ratio"], y["near"][0]))
    print("lf_%02d vs lf_%02d: " % (a, b) + " | ".join(row))
