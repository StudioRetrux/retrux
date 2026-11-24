import json, sys
raw = json.load(open(sys.argv[1]))
k0 = list(raw.keys())[0]
print("top key", k0)
fr = raw[k0]
print(type(fr), len(fr))
for f in fr:
    if isinstance(f, dict) and f.get("frame") in ("lf_03", "lf_04", "lf_05", "lf_06", "lf_07", "lf_10"):
        print(f.get("frame"), f.get("t"), {k: (v.get("theta"), v.get("ratio"), v.get("near"), v.get("conf")) for k, v in f["rings"].items()})
