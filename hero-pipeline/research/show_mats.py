import json, sys
inv = json.load(open(sys.argv[1], encoding="utf-8"))
mats = inv["materials"]
items = mats.items() if isinstance(mats, dict) else [(m.get("name"), m) for m in mats]
want = set(sys.argv[2].split("|"))
for name, m in items:
    if name not in want: continue
    print("=== MATERIAL", name, "| keys:", list(m.keys())[:20])
    nt = m.get("node_tree") or m.get("nodes")
    nodes = nt.get("nodes") if isinstance(nt, dict) else nt
    if isinstance(nodes, dict): nodes = list(nodes.values())
    for n in (nodes or []):
        t = n.get("type") or n.get("bl_idname")
        ins = n.get("inputs") or {}
        if isinstance(ins, list):
            ins = {i.get("name"): i.get("default_value", i.get("value")) for i in ins if not i.get("is_linked")}
        extra = {k: n[k] for k in ("image","interpolation","projection","blend_type","operation","noise_dimensions","feature","distance","color_ramp","sky_type") if k in n}
        print("  -", n.get("name"), t, {k: v for k, v in list(ins.items())[:14]}, extra)
    links = nt.get("links") if isinstance(nt, dict) else None
    if links: print("  links:", links[:30])
imgs = inv.get("images")
items = imgs.items() if isinstance(imgs, dict) else [(i.get("name"), i) for i in imgs]
print("=== IMAGES")
for name, im in items:
    print("  -", name, {k: im.get(k) for k in ("filepath","size","packed","colorspace","users","source")})
