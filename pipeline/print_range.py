import json, sys
d = json.load(open(sys.argv[1]))
for f in d["frames"]:
    n = int(f["frame"][3:])
    if 12 <= n <= 29:
        print(f["frame"], "  ".join("%s %3d/%.2f/%s/%.1f" % (r, f["rings"][r]["theta"], f["rings"][r]["ratio"], f["rings"][r]["near"][0], f["rings"][r]["conf"]) for r in "ABCD"))
