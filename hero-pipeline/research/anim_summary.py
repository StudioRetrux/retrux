import json, sys
d = json.load(open(sys.argv[1], encoding="utf-8"))
for fname in d:
    g = d[fname]
    print("=====", fname)
    print("NODES:", [ (n.get("name"), n.get("parent") if "parent" in n else None, n.get("mesh") is not None) for n in g["nodes"] ][:60])
    for a in g["animations"]:
        print(" ANIM", a.get("name"), "dur", a.get("duration") or a.get("max_time"))
        for c in a["channels"]:
            fr = c.get("frames_at_30fps") or []
            vals = c.get("values_blender") or c.get("values") or []
            print("   ch node=%s path=%s keys=%d t=[%s..%s] interp=%s first=%s last=%s" % (c.get("node"), c.get("path"), len(fr), fr[0] if fr else None, fr[-1] if fr else None, c.get("interpolation"), (vals[0] if vals else None), (vals[-1] if vals else None)))
