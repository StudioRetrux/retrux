# Bake speed / API test on Blender 5.2: one object (default V2_Massif), Smart UV into a new "bake" layer, a temporary
# material with the target image as the active node (the object has no material in the scene), Cycles CPU COMBINED bake.
# Never saves the .blend.   blender -b plate_scene_v7.blend --python bake_speedtest.py -- <out.png> [obj] [size] [samples]
import bpy, sys, time

argv = sys.argv[sys.argv.index("--") + 1:]
OUT = argv[0]
NAME = argv[1] if len(argv) > 1 else "V2_Massif"
SIZE = int(argv[2]) if len(argv) > 2 else 1024
SAMPLES = int(argv[3]) if len(argv) > 3 else 32

sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = SAMPLES
sc.cycles.use_denoising = False
try:
    sc.render.bake.margin = 4
    sc.render.bake.use_clear = True
except Exception as e:
    print("bake settings:", e)

o = bpy.data.objects[NAME]
for x in bpy.data.objects:
    x.select_set(False)
o.select_set(True)
bpy.context.view_layer.objects.active = o
print("OBJ", o.name, "polys", len(o.data.polygons), "uv", [u.name for u in o.data.uv_layers], "mats", [s.material.name if s.material else None for s in o.material_slots])

t0 = time.time()
me = o.data
if me.users > 1:
    o.data = me = me.copy()
uv = me.uv_layers.new(name="bake")
me.uv_layers.active = uv
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=1.15192, island_margin=0.004, area_weight=0.0, correct_aspect=True, scale_to_bounds=True)
bpy.ops.object.mode_set(mode='OBJECT')
print("UV %.1f s" % (time.time() - t0))

img = bpy.data.images.new("bake_" + NAME, SIZE, SIZE, alpha=False, float_buffer=True)
mats = [s.material for s in o.material_slots if s.material]
if not mats:
    m = bpy.data.materials.new("bake_tmp_" + NAME)
    m.use_nodes = True
    o.data.materials.append(m)
    mats = [m]
for m in mats:
    nt = m.node_tree
    n = nt.nodes.new('ShaderNodeTexImage')
    n.image = img
    n.select = True
    nt.nodes.active = n

t1 = time.time()
bpy.ops.object.bake(type='COMBINED', margin=4, use_clear=True, uv_layer="bake")
print("BAKE %s %dx%d %d spp: %.1f s" % (NAME, SIZE, SIZE, SAMPLES, time.time() - t1))
img.filepath_raw = OUT
img.file_format = 'OPEN_EXR' if OUT.lower().endswith(".exr") else 'PNG'
img.save()
print("SAVED", OUT)
