import json, sys, math
d = json.load(open(sys.argv[1]))
fit = json.load(open(sys.argv[2]))
for f in sorted(d["frames"], key=lambda f: int(f["frame"][3:])):
    i = int(f["frame"][3:])
    c, dd = f["rings"]["C"], f["rings"]["D"]
    print("%s C %3d/%.2f/%s/%.2f (model err %4.0f)   D %3d/%.2f/%s/%.2f" % (f["frame"], c["theta"], c["ratio"], c["near"][0], c["conf"], fit["C"]["per_frame_deg"][i], dd["theta"], dd["ratio"], dd["near"][0], dd["conf"]))
