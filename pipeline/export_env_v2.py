# env_proxy.glb from the v2 plate scene (massif moved, ridge split off): the projection geometry must match the
# plate it carries. Budgets as hero-pipeline/blender/export_assets.py; never saves the .blend.
#   blender -b plate_scene_v2.blend --python export_env_v2.py -- <out.glb>
import bpy, os, sys

OUT = sys.argv[sys.argv.index("--") + 1]
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


env = [o for o in bpy.data.objects if o.type == 'MESH' and o.name not in SKIP]
for o in env:
    n = tri_count(o)
    ratio = min(1.0, budget(o.name) / max(n, 1))
    if ratio < 0.98:
        d = o.modifiers.new("WEB_DECIMATE", 'DECIMATE')
        d.decimate_type = 'COLLAPSE'
        d.ratio = ratio
        d.use_collapse_triangulate = True
    print("ENV", o.name, n, round(ratio, 4))
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
