# env_proxy.glb v4 (QC round 10, cursor-orbit MAJOR "dotted line of bright specks across the far-left ridge"): as
# export_env_v3.py, but the mountain proxies are made watertight first. The decoded v3 proxy: V2_Ridge 2623 open edges, 635
# open-edge endpoints lying on ANOTHER open edge within 1 cm (T-junctions between patches of different density) and 286
# near-duplicates; the engine rasterised the farther massif through those hairline cracks. Per object: weld (remove_doubles
# at TOL), then repeatedly split every boundary edge at any boundary vertex lying on it (within TOL) and weld the new vertex
# to it, then weld again. Never saves the .blend.
#   blender -b plate_scene_v7.blend --python export_env_v4.py -- <out.glb> [near=..] [full=A,B] [tol=0.03] [fix=A,B,..]
import bpy, bmesh, os, sys, time
from mathutils import Vector
from mathutils.geometry import intersect_point_line

ARGV = sys.argv[sys.argv.index("--") + 1:]
OUT = ARGV[0]
FLAGS = dict(a.split("=", 1) for a in ARGV[1:] if "=" in a)
NEAR_M = float(FLAGS.get("near", 40.0))
NEAR_RATIO = float(FLAGS.get("ratio", 0.5))
NEAR_CAP = int(FLAGS.get("cap", 40000))
FULL = set(n for n in FLAGS.get("full", "").split(",") if n)
TOL = float(FLAGS.get("tol", 0.03))
FIX = [n for n in FLAGS.get("fix", "V2_Ridge,V2_Massif,Object_2.009,Object_2.010").split(",") if n]
print("PARAMS near %.1f m ratio %.2f cap %d full %s tol %.3f fix %s" % (NEAR_M, NEAR_RATIO, NEAR_CAP, sorted(FULL), TOL, FIX))
CAM = Vector((0.23183887899931777, -11.787528905312952, 2.903973052988094))

RINGS = ["Circle.025", "Circle.026", "Circle.027", "Circle.028", "Circle.029", "Circle.030", "Circle.031", "Circle.032"]
HERO = RINGS + ["Icosphere.011", "Cube.009", "Cube.010"]
CLOUDS = [o.name for o in bpy.data.objects if o.name.startswith("pngimg.com")]
WATER = ["Plane.011", "Plane.013"]
SKIP = set(HERO + CLOUDS + WATER) | {o.name for o in bpy.data.objects if o.name.startswith("V2_") and o.name not in ("V2_Ridge", "V2_Massif")}


def budget(name):
    if name == "V2_Massif":
        return 12000
    if name == "V2_Ridge":
        return 8000
    if name.startswith("Object_2"):
        return 16000
    if name == "BG.001":
        return 10 ** 9
    if name.startswith("gfsw"):
        return 6000
    if name == "Plane.015":
        return 8000
    if name.startswith("Plane.0"):
        return 4000
    if name.startswith("Retopo_Plane"):
        return 5000
    if name in ("rock_big_3.004", "rock_big_3.005"):
        return 6000
    return 3000


def tri_count(obj):
    deps = bpy.context.evaluated_depsgraph_get()
    eo = obj.evaluated_get(deps)
    me = eo.to_mesh()
    me.calc_loop_triangles()
    n = len(me.loop_triangles)
    eo.to_mesh_clear()
    return n


def near_dist(obj):
    cs = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    lo = Vector((min(c.x for c in cs), min(c.y for c in cs), min(c.z for c in cs)))
    hi = Vector((max(c.x for c in cs), max(c.y for c in cs), max(c.z for c in cs)))
    q = Vector((min(max(CAM.x, lo.x), hi.x), min(max(CAM.y, lo.y), hi.y), min(max(CAM.z, lo.z), hi.z)))
    return (q - CAM).length


def open_edges(bm):
    return [e for e in bm.edges if e.is_boundary]


def repair(obj, tol_world):
    """Weld + T-junction split. Works in object space (tolerance scaled by the object's largest scale)."""
    t0 = time.time()
    sc = max(abs(s) for s in obj.matrix_world.to_scale())
    tol = tol_world / max(sc, 1e-6)
    me = obj.data
    if me.users > 1:
        obj.data = me = me.copy()
    bm = bmesh.new()
    bm.from_mesh(me)
    b0 = len(open_edges(bm))
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=tol)
    b1 = len(open_edges(bm))
    G = max(tol * 40.0, 0.5)
    splits_total = 0
    for it in range(12):
        bm.verts.ensure_lookup_table()
        bm.edges.ensure_lookup_table()
        bed = open_edges(bm)
        if not bed:
            break
        grid = {}
        for e in bed:
            a, b = e.verts[0].co, e.verts[1].co
            lo = [min(a[i], b[i]) - tol for i in range(3)]
            hi = [max(a[i], b[i]) + tol for i in range(3)]
            for cx in range(int(lo[0] // G), int(hi[0] // G) + 1):
                for cy in range(int(lo[1] // G), int(hi[1] // G) + 1):
                    for cz in range(int(lo[2] // G), int(hi[2] // G) + 1):
                        grid.setdefault((cx, cy, cz), []).append(e)
        bverts = {v for e in bed for v in e.verts}
        best = {}  # edge -> (fac, vert): one split per edge per pass
        for v in bverts:
            key = (int(v.co.x // G), int(v.co.y // G), int(v.co.z // G))
            for e in grid.get(key, ()):
                if v in e.verts:
                    continue
                a, b = e.verts[0].co, e.verts[1].co
                pt, fac = intersect_point_line(v.co, a, b)
                if not (0.0 < fac < 1.0) or (pt - v.co).length >= tol:
                    continue
                if (v.co - a).length < tol or (v.co - b).length < tol:
                    continue
                # Never split an edge of a face that already uses v (it would fold the face onto itself).
                if any(v in f.verts for f in e.link_faces):
                    continue
                if e not in best or fac < best[e][0]:
                    best[e] = (fac, v)
        if not best:
            break
        targetmap = {}
        used = set()
        for e, (fac, v) in best.items():
            if v in used or not e.is_valid:
                continue
            ne, nv = bmesh.utils.edge_split(e, e.verts[0], fac)
            targetmap[nv] = v
            used.add(v)
        if not targetmap:
            break
        bmesh.ops.weld_verts(bm, targetmap=targetmap)
        splits_total += len(targetmap)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=tol * 0.25)
    # Degenerate (zero-area) faces from collinear splits are harmless; triangulate n-gons for a clean export.
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 3])
    b2 = len(open_edges(bm))
    bm.to_mesh(me)
    bm.free()
    # The glTF exporter flagged the repaired meshes "not valid" (zero-area faces from collinear splits, doubled edges):
    # let Blender clean them.
    bad = me.validate(verbose=False, clean_customdata=False)
    me.update()
    print("VALIDATE %-14s fixed %s" % (obj.name, bad))
    print("REPAIR %-14s open %5d -> weld %5d -> %5d  splits %5d  (%.1f s, tol %.4f)" % (obj.name, b0, b1, b2, splits_total, time.time() - t0, tol))


for name in FIX:
    o = bpy.data.objects.get(name)
    if o is None or o.type != 'MESH':
        print("REPAIR skip (missing)", name)
        continue
    repair(o, TOL)

env = [o for o in bpy.data.objects if o.type == 'MESH' and o.name not in SKIP]
tot = 0
for o in env:
    n = tri_count(o)
    d = near_dist(o)
    r = min(1.0, budget(o.name) / max(n, 1))
    if d < NEAR_M:
        r = min(1.0, max(r, min(NEAR_RATIO, NEAR_CAP / max(n, 1))))
    if o.name in FULL:
        r = 1.0
    tot += int(n * r)
    print("ENV %-28s tris %8d near %7.1f m  ratio %.4f  (%d tris)" % (o.name, n, d, r, int(n * r)))
    if r < 0.98:
        m = o.modifiers.new("WEB_DECIMATE", 'DECIMATE')
        m.decimate_type = 'COLLAPSE'
        m.ratio = r
        m.use_collapse_triangulate = True
print("TOTAL tris %d" % tot)
for o in bpy.data.objects:
    o.select_set(False)
for o in env:
    o.select_set(True)
bpy.context.view_layer.objects.active = env[0]
kw = dict(filepath=OUT, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
          export_texcoords=True, export_normals=True, export_tangents=False, export_materials='NONE',
          export_cameras=False, export_lights=False, export_animations=False, export_extras=False,
          export_vertex_color='NONE',
          export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
          export_draco_position_quantization=14, export_draco_normal_quantization=10,
          export_draco_texcoord_quantization=12)
op = bpy.ops.export_scene.gltf
props = set(op.get_rna_type().properties.keys())
res = op(**{k: v for k, v in kw.items() if k in props})
print("EXPORT_DONE", res, round(os.path.getsize(OUT) / 1024, 1), "KB", len(env), "objects")
