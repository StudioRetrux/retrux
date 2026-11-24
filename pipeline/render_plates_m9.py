# Retrux environment plates, macOS port of render_plates_v3.py (round 11, ENV lane): Blender 5.2 Cycles on the Metal GPU,
# headless, never saves the .blend. Same scene state and render settings as the v7 plates (hero hidden, calm water, clouds
# camera-invisible but glossy-visible, texture limit 1024, simplify 3, 64 spp adaptive 0.03 / min 16, OIDN FAST, bounces
# 6/2/3/4/6/0, caustics off, clamp indirect 10), the same lens / overscan / plate size (2340 x 1273, 1.25 plate px per
# reference px, overscan x 0.15, top 0.20, bottom 0.13), so a new plate registers with the old ones.
#   blender -b plate_scene_v7_copy.blend --python render_plates_m9.py -- <outDir> <name> <camera> [mode] [k=v ...]
# camera:
#   json:<plate_x.json>          the exact camera block of an existing plate (location, rotation, lens, shift)
#   rig:<r>,<azDeg>,<elDeg>,<pitchDeg>   the engine rig (CameraRig.apply): spherical offset from the orb, absolute pitch
# mode: full (default) | crop:x0:y0:x1:y1 (normalized border, y from the BOTTOM) | probe (25 %, 16 spp)
# flags: device=METAL|CPU  spp=64  nowisp (hide V2_SummitWisp)  nomist (hide V2_BaseMist)
# Writes <outDir>/<name>.exr (scene-linear RGBA half, ZIP) and <name>.json (camera block in the old plates' format).
import bpy, json, math, os, sys, time
from mathutils import Euler, Vector

args = sys.argv[sys.argv.index("--") + 1:]
OUT, NAME, CAMSPEC = args[0], args[1], args[2]
MODE = args[3] if len(args) > 3 and "=" not in args[3] and args[3] not in ("nowisp", "nomist") else "full"
FLAGS = dict(a.split("=", 1) for a in args[3:] if "=" in a)
WORDS = set(a for a in args[3:] if "=" not in a)
DEVICE = FLAGS.get("device", "METAL")
os.makedirs(OUT, exist_ok=True)
T0 = time.time()
LOG = open(os.path.join(OUT, "render_%s_log.txt" % NAME), "w", encoding="utf-8")


def log(*a):
    s = "[%7.1fs] " % (time.time() - T0) + " ".join(str(x) for x in a)
    print(s)
    LOG.write(s + "\n")
    LOG.flush()


scene = bpy.context.scene
RINGS = ["Circle.025", "Circle.026", "Circle.027", "Circle.028", "Circle.029", "Circle.030", "Circle.031", "Circle.032"]
HERO = RINGS + ["Icosphere.011", "Cube.009", "Cube.010"]
CLOUDS = [o.name for o in bpy.data.objects if o.name.startswith("pngimg.com")]
for n in HERO:
    bpy.data.objects[n].hide_render = True
for n in CLOUDS:
    o = bpy.data.objects[n]
    o.visible_camera = False            # plates get live engine clouds instead
    o.visible_glossy = True             # kept in the water reflections
wave = bpy.data.objects["Plane.011"].modifiers.get("Wave")
if wave:
    wave.show_render = False            # calm water
if "nowisp" in WORDS and "V2_SummitWisp" in bpy.data.objects:
    bpy.data.objects["V2_SummitWisp"].hide_render = True
if "nomist" in WORDS and "V2_BaseMist" in bpy.data.objects:
    bpy.data.objects["V2_BaseMist"].hide_render = True
scene.frame_set(1)

# ---- camera (the v3 plate construction)
OX, OY_TOP, OY_BOT = 0.15, 0.20, 0.13
OY = (OY_TOP + OY_BOT) / 2
SCALE = 0.25 if MODE == "probe" else 1.25
REST_LENS = 42.253045166243865
cd = bpy.data.cameras.new("__plate_cam__")
cam = bpy.data.objects.new("__plate_cam__", cd)
scene.collection.objects.link(cam)
cam.rotation_mode = 'XYZ'
cd.clip_start = 0.05
cd.clip_end = 5000.0
cd.sensor_fit = 'HORIZONTAL'
cd.sensor_width = 36.0
W = int(round(1440 * SCALE * (1.0 + 2.0 * OX)))
H = int(round(766 * SCALE * (1.0 + 2.0 * OY)))
if CAMSPEC.startswith("json:"):
    meta = json.load(open(CAMSPEC[5:], encoding="utf-8"))
    c = meta["camera"]
    cd.lens = c["lens_mm"]
    cd.shift_x = 0.0
    cd.shift_y = meta["overscan"]["shift_y"]
    cam.location = Vector(c["location_blender"])
    cam.rotation_euler = Euler([math.radians(v) for v in c["rotation_euler_deg"]], 'XYZ')
    src = {"from": os.path.basename(CAMSPEC[5:])}
else:
    r, az, el, pitch = [float(v) for v in CAMSPEC.split(":", 1)[1].split(",")]
    orb = bpy.data.objects["Icosphere.011"].matrix_world.translation
    off3 = (r * math.cos(math.radians(el)) * math.sin(math.radians(az)), r * math.sin(math.radians(el)),
            r * math.cos(math.radians(el)) * math.cos(math.radians(az)))
    loc = (orb.x + off3[0], orb.y - off3[2], orb.z + off3[1])
    yaw = math.degrees(math.atan2(-(orb.x - loc[0]), orb.y - loc[1]))
    cd.lens = REST_LENS / (1.0 + 2.0 * OX)
    cd.shift_x = 0.0
    cd.shift_y = 0.5 * (OY_TOP - OY_BOT) * 766 * 1.25 / (1440 * 1.25 * (1.0 + 2.0 * OX))
    cam.location = loc
    cam.rotation_euler = Euler((math.radians(90.0 + pitch), 0.0, math.radians(yaw)), 'XYZ')
    src = {"rig": {"r": r, "az": az, "el": el, "pitch": pitch}}
scene.camera = cam

# ---- render settings (the v7 plates')
rd = scene.render
cy = scene.cycles
rd.engine = 'CYCLES'
if DEVICE == "METAL":
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    for d in prefs.devices:
        d.use = d.type == 'METAL'
    cy.device = 'GPU'
else:
    cy.device = 'CPU'
rd.resolution_x, rd.resolution_y, rd.resolution_percentage = W, H, 100
rd.film_transparent = True
rd.use_simplify = True
rd.simplify_subdivision_render = 3
cy.texture_limit_render = '1024'
cy.use_auto_tile = True
cy.tile_size = 2048
cy.use_adaptive_sampling = True
if MODE == "probe":
    cy.samples, cy.adaptive_threshold, cy.adaptive_min_samples = 16, 0.05, 8
else:
    cy.samples, cy.adaptive_threshold, cy.adaptive_min_samples = int(FLAGS.get("spp", 64)), 0.03, 16
cy.use_denoising = True
cy.denoiser = 'OPENIMAGEDENOISE'
cy.denoising_input_passes = 'RGB_ALBEDO_NORMAL'
cy.denoising_prefilter = 'FAST'
try:
    cy.denoising_use_gpu = False        # the v7 plates were denoised on the CPU
except Exception:
    pass
cy.max_bounces = 6
cy.diffuse_bounces = 2
cy.glossy_bounces = 3
cy.transmission_bounces = 4
cy.transparent_max_bounces = 6
cy.volume_bounces = 0
cy.caustics_reflective = False
cy.caustics_refractive = False
cy.sample_clamp_indirect = 10.0
if MODE.startswith("crop:"):
    x0, y0, x1, y1 = [float(v) for v in MODE.split(":")[1:5]]
    rd.use_border = True
    rd.use_crop_to_border = True
    rd.border_min_x, rd.border_min_y, rd.border_max_x, rd.border_max_y = x0, y0, x1, y1
log("camera", NAME, json.dumps(src), "loc", [round(v, 4) for v in cam.location], "rot",
    [round(math.degrees(v), 4) for v in cam.rotation_euler], "lens", round(cd.lens, 4), "res", W, H, "mode", MODE, "device", DEVICE)

exr = os.path.join(OUT, NAME + ".exr")
rd.image_settings.file_format = 'OPEN_EXR'
rd.image_settings.color_mode = 'RGBA'
rd.image_settings.color_depth = '16'
rd.image_settings.exr_codec = 'ZIP'
rd.filepath = exr
t = time.time()
bpy.ops.render.render(write_still=True)
secs = time.time() - t
log("render done in %.1fs" % secs)
info = {"name": NAME, "mode": MODE, "width": W, "height": H, "full_width": W, "full_height": H,
        "overscan": {"x": OX, "top": OY_TOP, "bottom": OY_BOT, "shift_y": cd.shift_y},
        "camera": {"location_blender": list(cam.location), "rotation_euler_deg": [math.degrees(a) for a in cam.rotation_euler],
                   "lens_mm": cd.lens, "sensor_mm": 36.0, "sensor_fit": "HORIZONTAL"},
        "png_exposure_stops": -2.158, "source": src, "device": DEVICE, "flags": sorted(WORDS),
        "border": [rd.border_min_x, rd.border_min_y, rd.border_max_x, rd.border_max_y] if rd.use_border else None,
        "render_seconds": secs}
with open(os.path.join(OUT, NAME + ".json"), "w", encoding="utf-8") as f:
    json.dump(info, f, indent=1)
log("ALLDONE")
