# UV layout test for the bake: repair (weld + T-junctions), then either Smart UV with a wide angle limit or a plain
# angle-based Unwrap of each connected piece, and report island count / UV area use; bakes a quick 512 COMBINED (8 spp) so
# the islands can be seen. Never saves.   blender -b plate_scene_v7.blend --python bake_uvtest.py -- <outDir> <obj> <mode>
import bpy, bmesh, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from env_repair import repair

argv = sys.argv[sys.argv.index("--") + 1:]
OUTD, NAME, MODE = argv[0], argv[1], argv[2]
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = 8
o = bpy.data.objects[NAME]
for x in bpy.data.objects:
    x.select_set(False)
o.select_set(True)
bpy.context.view_layer.objects.active = o
repair(o, 0.03)
me = o.data
uv = me.uv_layers.new(name="bake")
me.uv_layers.active = uv
t0 = time.time()
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
if MODE == "smart89":
    bpy.ops.uv.smart_project(angle_limit=1.5533, island_margin=0.003, area_weight=0.0, correct_aspect=True, scale_to_bounds=True)
elif MODE == "smart70":
    bpy.ops.uv.smart_project(angle_limit=1.2217, island_margin=0.003, area_weight=0.0, correct_aspect=True, scale_to_bounds=True)
else:
    bpy.ops.mesh.mark_seam(clear=True)
    bpy.ops.uv.unwrap(method='MINIMUM_STRETCH' if MODE == "minstretch" else 'ANGLE_BASED', margin=0.003)
    bpy.ops.uv.pack_islands(margin=0.003)
bpy.ops.object.mode_set(mode='OBJECT')
print("UV %s %.1f s" % (MODE, time.time() - t0))
# Island stats.
bm = bmesh.new()
bm.from_mesh(me)
lay = bm.loops.layers.uv["bake"]
bm.faces.ensure_lookup_table()
# Union-find over faces sharing a UV-continuous edge.
parent = list(range(len(bm.faces)))
def find(i):
    while parent[i] != i:
        parent[i] = parent[parent[i]]
        i = parent[i]
    return i
area_uv = 0.0
for f in bm.faces:
    uvs = [l[lay].uv for l in f.loops]
    a = 0.0
    for i in range(1, len(uvs) - 1):
        a += abs((uvs[i] - uvs[0]).cross(uvs[i + 1] - uvs[0])) * 0.5
    area_uv += a
    for e in f.edges:
        for g in e.link_faces:
            if g.index == f.index:
                continue
            # UV-continuous if both shared verts have the same UVs in both faces.
            ok = True
            for v in e.verts:
                u1 = [l[lay].uv for l in f.loops if l.vert == v][0]
                u2 = [l[lay].uv for l in g.loops if l.vert == v][0]
                if (u1 - u2).length > 1e-5:
                    ok = False
            if ok:
                ra, rb = find(f.index), find(g.index)
                if ra != rb:
                    parent[ra] = rb
islands = len({find(i) for i in range(len(bm.faces))})
bm.free()
print("ISLANDS %s %d  uv area use %.1f%%  faces %d" % (MODE, islands, area_uv * 100, len(me.polygons)))
img = bpy.data.images.new("t", 512, 512, alpha=False, float_buffer=True)
mats = [s.material for s in o.material_slots if s.material]
for m in mats:
    n = m.node_tree.nodes.new('ShaderNodeTexImage')
    n.image = img
    m.node_tree.nodes.active = n
t1 = time.time()
bpy.ops.object.bake(type='COMBINED', margin=2, use_clear=True, uv_layer="bake")
print("BAKE %.1f s" % (time.time() - t1))
img.filepath_raw = os.path.join(OUTD, "uvtest_%s_%s.exr" % (NAME, MODE))
img.file_format = 'OPEN_EXR'
img.save()
