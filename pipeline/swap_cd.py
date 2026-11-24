import json, sys
d = json.load(open(sys.argv[1]))
for f in d["frames"]:
    if f["frame"] in ("lf_23", "lf_24"):
        r = f["rings"]
        r["C"], r["D"] = r["D"], r["C"]
        f["notes"] = (f.get("notes", "") + " [C/D swapped: chunk 5 analysis, C's band track 0.62 -> 0.55 -> 0.39 -> 0.13 -> 0]").strip()
json.dump(d, open(sys.argv[2], "w"), indent=1)
print("swapped C/D at lf_23, lf_24")
