# env_proxy.glb v3 (round-7 T06 stage B): the same objects and far budgets as export_env_v2.py, but the NEAR proxies
# (closest point < NEAR_M from the rest camera: floes, rocks, the mound) keep at least NEAR_RATIO of their triangles
# (capped at NEAR_CAP), so their silhouettes match the plates within ~1 px (decimated near proxies gave doubled rock
# contours, dotted bright rims and the floe-end cut when the cursor orbits). Never saves the .blend.
#   blender -b plate_scene_v4.blend --python export_env_v3.py -- <out.glb> [list]
# "list" only prints the table (no export).
import bpy, os, sys
from mathutils import Vector

ARGV = sys.argv[sys.argv.index("--") + 1:]
OUT = ARGV[0]
# Flags after the output path: "list", "near=<m>", "ratio=<0..1>", "cap=<tris>".
FLAGS = dict(a.split("=", 1) for a in ARGV[1:] if "=" in a)
LIST_ONLY = "list" in ARGV[1:]
NEAR_M = float(FLAGS.get("near", 40.0))
NEAR_RATIO = float(FLAGS.get("ratio", 0.5))
NEAR_CAP = int(FLAGS.get("cap", 40000))
# "full=A,B": objects exported undecimated whatever their distance (the far-left ridge: cracks in its decimated proxy
# showed the massif's snow through it as white streaks in cursor-orbit views; full detail closes them).
FULL = set(n for n in FLAGS.get("full", "").split(",") if n)
print("PARAMS near %.1f m ratio %.2f cap %d full %s" % (NEAR_M, NEAR_RATIO, NEAR_CAP, sorted(FULL)))
CAM = Vector((0.23183887899931777, -11.787528905312952, 2.903973052988094))   # the solved rest camera (render_plates_v3.py)

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
    # Closest point of the world-space bounding box to the rest camera (0 when the camera is inside it).
    cs = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    lo = Vector((min(c.x for c in cs), min(c.y for c in cs), min(c.z for c in cs)))
    hi = Vector((max(c.x for c in cs), max(c.y for c in cs), max(c.z for c in cs)))
    q = Vector((min(max(CAM.x, lo.x), hi.x), min(max(CAM.y, lo.y), hi.y), min(max(CAM.z, lo.z), hi.z)))
    return (q - CAM).length


env = [o for o in bpy.data.objects if o.type == 'MESH' and o.name not in SKIP]
tot_v2 = tot_v3 = 0
for o in env:
    n = tri_count(o)
    d = near_dist(o)
    r2 = min(1.0, budget(o.name) / max(n, 1))
    r3 = r2
    if d < NEAR_M:
        # At least NEAR_RATIO of the source triangles, at most NEAR_CAP triangles, never below the v2 budget.
        r3 = min(1.0, max(r2, min(NEAR_RATIO, NEAR_CAP / max(n, 1))))
    if o.name in FULL:
        r3 = 1.0
    tot_v2 += int(n * r2)
    tot_v3 += int(n * r3)
    print("ENV %-28s tris %8d near %7.1f m  v2 %.4f -> v3 %.4f  (%d tris)" % (o.name, n, d, r2, r3, int(n * r3)))
    if not LIST_ONLY and r3 < 0.98:
        m = o.modifiers.new("WEB_DECIMATE", 'DECIMATE')
        m.decimate_type = 'COLLAPSE'
        m.ratio = r3
        m.use_collapse_triangulate = True
print("TOTAL tris v2 %d -> v3 %d" % (tot_v2, tot_v3))
if LIST_ONLY:
    print("LIST_DONE")
    sys.exit(0)
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
