# World-only sky panorama for the baked environment's lake reflection (audit A1 R8 / #12): the lake mirrors the Nishita
# WORLD (dark, saturated near the horizon), never BG.001 (camera-visible only). Every object hidden, equirect camera at the
# lake (ripple centre, 0.3 m up), Cycles CPU, scene-linear EXR. Also renders the summit wisp alone (RGBA card from the rest
# camera, transparent film) for an engine card. Never saves the .blend.
#   blender -b plate_scene_v7.blend --python render_sky_equirect.py -- <outDir> [w=2048] [spp=64]
import bpy, json, math, os, sys
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
OUT = argv[0]
FLAGS = dict(a.split("=", 1) for a in argv[1:] if "=" in a)
W = int(FLAGS.get("w", 2048))
SPP = int(FLAGS.get("spp", 64))
os.makedirs(OUT, exist_ok=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = SPP
sc.cycles.use_denoising = True
sc.render.image_settings.file_format = 'OPEN_EXR'
try:
    sc.render.image_settings.color_depth = '16'
except Exception:
    pass
hidden = {}
for o in bpy.data.objects:
    hidden[o.name] = o.hide_render
    if o.type != 'CAMERA':
        o.hide_render = True

# 1. Equirect of the world from the lake (Blender: ripple centre (0, 8.6, 0) -> three (0, 0, -8.6)), 0.3 m up.
cd = bpy.data.cameras.new("sky_eq")
cd.type = 'PANO'
try:
    cd.panorama_type = 'EQUIRECTANGULAR'
except Exception:
    cd.cycles.panorama_type = 'EQUIRECTANGULAR'
co = bpy.data.objects.new("sky_eq", cd)
co.location = Vector((0.0, 8.6, 0.3))
# The same orientation as pano_orb.exr (render_plates_v3.py "pano": X 90, Z -90 deg = three.js's equirect convention), so the
# engine samples it like the panorama.
co.rotation_euler = (math.radians(90.0), 0.0, math.radians(-90.0))
sc.collection.objects.link(co)
sc.camera = co
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = W, W // 2, 100
sc.render.film_transparent = False
sc.render.filepath = os.path.join(OUT, "sky_world.exr")
bpy.ops.render.render(write_still=True)
print("SKY_DONE", sc.render.filepath)

# 2. The summit wisp alone from the rest camera (RGBA, transparent film), cropped later to its box.
wisp = bpy.data.objects.get("V2_SummitWisp")
if wisp is not None:
    for o in bpy.data.objects:
        if o.type != 'CAMERA':
            o.hide_render = True
    wisp.hide_render = False
    meta = json.load(open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "blend", "v2build7", "plate_rest.json"), encoding="utf-8"))
    c = meta["camera"]
    rd = bpy.data.cameras.new("wisp_cam")
    rd.lens = c["lens_mm"]
    rd.sensor_width = c["sensor_mm"]
    rd.sensor_fit = c["sensor_fit"]
    rd.shift_y = meta["overscan"]["shift_y"]
    ro = bpy.data.objects.new("wisp_cam", rd)
    ro.location = Vector(c["location_blender"])
    ro.rotation_euler = [math.radians(v) for v in c["rotation_euler_deg"]]
    sc.collection.objects.link(ro)
    sc.camera = ro
    sc.render.resolution_x, sc.render.resolution_y = meta["width"] // 2, meta["height"] // 2
    sc.render.film_transparent = True
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.filepath = os.path.join(OUT, "wisp_rest.exr")
    bpy.ops.render.render(write_still=True)
    print("WISP_DONE", sc.render.filepath, "box centre", [round(v, 3) for v in wisp.matrix_world.translation], "dims", [round(v, 2) for v in wisp.dimensions])
