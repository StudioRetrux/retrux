import json, sys
d = json.load(open(sys.argv[1], encoding="utf-8"))
for k in ("rest_camera","sun_dir","hero_center","orb","water","world"):
    print(k, "=", json.dumps(d[k]))
print("rings:")
for n, r in d["rings"].items(): print("  ", n, json.dumps(r))
sb = d["sky_backdrop"]; print("sky_backdrop verts:", json.dumps(sb["verts"]), "uvs:", sb["uvs"])
for c in d["clouds"]:
    print("cloud", c["name"], c["image"], "verts:", json.dumps([[round(v,3) for v in p] for p in c["verts"]]), "uvs:", c["uvs"])
print("env objects:", len(d["env_objects"]))
for e in d["env_objects"]: print("  ", e)
