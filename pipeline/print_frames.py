import json, sys
d = json.load(open(sys.argv[1]))
fr = d["frames"] if isinstance(d, dict) else d
by = {f["frame"]: f for f in fr}
for k in ["lf_00", "lf_13", "lf_14", "lf_20", "lf_23", "lf_24"]:
    f = by[k]
    print(k, json.dumps({r: [round(f["rings"][r]["theta"]), round(f["rings"][r]["ratio"], 2), f["rings"][r]["near"], round(f["rings"][r]["conf"], 2)] for r in "ABCD"}))
