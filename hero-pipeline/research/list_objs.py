import json, sys
inv = json.load(open(sys.argv[1], encoding="utf-8"))
print("TOP KEYS:", list(inv.keys())[:40])
objs = inv.get("objects") or inv.get("scene", {}).get("objects")
if isinstance(objs, dict):
    items = list(objs.items())
elif isinstance(objs, list):
    items = [(o.get("name"), o) for o in objs]
else:
    items = []
print("N OBJECTS:", len(items))
for name, o in items:
    keys = list(o.keys())
    t = o.get("type")
    vis = o.get("hide_render"), o.get("hide_viewport"), o.get("visible_camera", None)
    mats = o.get("material_slots") or o.get("materials")
    if isinstance(mats, list):
        mats = [m.get("material") if isinstance(m, dict) else m for m in mats]
    mesh = o.get("mesh") or {}
    nv = o.get("verts") or o.get("n_verts") or (mesh.get("verts") if isinstance(mesh, dict) else None)
    nf = o.get("faces") or o.get("n_faces") or (mesh.get("faces") if isinstance(mesh, dict) else None)
    mods = o.get("modifiers")
    if isinstance(mods, list):
        mods = [ (m.get("type"), m.get("name")) if isinstance(m, dict) else m for m in mods ]
    coll = o.get("collections") or o.get("users_collection")
    parent = o.get("parent")
    print(f"- {name} | {t} | parent={parent} | coll={coll} | hide_render/vp={vis} | v={nv} f={nf} | mats={mats} | mods={mods}")
