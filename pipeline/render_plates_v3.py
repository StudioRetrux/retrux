# Retrux hero plate renders (Blender 5.2 Cycles CPU, headless, never saves the .blend).
#   blender -b --factory-startup -t 2 "Home - EXPORT.blend" --python render_plates.py -- <OUT_DIR> <mode>
# mode:
#   probe  rest plate at 25 % with 16 spp, to measure time and RAM
#   plate  rest plate at 1.5x of 1440x766 plus overscan (hero hidden, calm water, clouds camera-invisible)
#   pano   360-degree equirect from the orb centre (hero hidden) for reflections, three.js convention
# Writes <name>.exr (scene-linear RGBA) and <name>.png (16-bit, Standard view, auto exposure) + <name>.json.
import bpy, json, math, os, sys, time, ctypes
from ctypes import wintypes
from mathutils import Euler
import numpy as np

args = sys.argv[sys.argv.index("--") + 1:]
OUT, MODE = args[0], args[1]
# v2: which camera ("rest" = the solved rest camera; "hold" = the engine's press-and-hold dolly pose,
# CameraRig with CAM_TARGETS.expand r 12.7, el -3.3, pitch 4.55, az 0.64, around the orb).
CAMSEL = args[2] if len(args) > 2 else "rest"
os.makedirs(OUT, exist_ok=True)
LOG = open(os.path.join(OUT, "render_%s_%s_log.txt" % (CAMSEL, MODE.replace(":", "_"))), "w", encoding="utf-8")
T0 = time.time()


class PMC(ctypes.Structure):
    _fields_ = [("cb", wintypes.DWORD), ("PageFaultCount", wintypes.DWORD),
                ("PeakWorkingSetSize", ctypes.c_size_t), ("WorkingSetSize", ctypes.c_size_t),
                ("QuotaPeakPagedPoolUsage", ctypes.c_size_t), ("QuotaPagedPoolUsage", ctypes.c_size_t),
                ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t), ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
                ("PagefileUsage", ctypes.c_size_t), ("PeakPagefileUsage", ctypes.c_size_t),
                ("PrivateUsage", ctypes.c_size_t)]


class MEMSTAT(ctypes.Structure):
    _fields_ = [("dwLength", wintypes.DWORD), ("dwMemoryLoad", wintypes.DWORD),
                ("ullTotalPhys", ctypes.c_ulonglong), ("ullAvailPhys", ctypes.c_ulonglong),
                ("ullTotalPageFile", ctypes.c_ulonglong), ("ullAvailPageFile", ctypes.c_ulonglong),
                ("ullTotalVirtual", ctypes.c_ulonglong), ("ullAvailVirtual", ctypes.c_ulonglong),
                ("ullAvailExtendedVirtual", ctypes.c_ulonglong)]


_k32 = ctypes.WinDLL("kernel32", use_last_error=True)
_psapi = ctypes.WinDLL("psapi", use_last_error=True)
_k32.GetCurrentProcess.restype = wintypes.HANDLE
_psapi.GetProcessMemoryInfo.argtypes = [wintypes.HANDLE, ctypes.POINTER(PMC), wintypes.DWORD]
_k32.GlobalMemoryStatusEx.argtypes = [ctypes.POINTER(MEMSTAT)]


def sys_avail_mb():
    m = MEMSTAT()
    m.dwLength = ctypes.sizeof(m)
    _k32.GlobalMemoryStatusEx(ctypes.byref(m))
    return m.ullAvailPhys >> 20


def mem():
    c = PMC()
    c.cb = ctypes.sizeof(c)
    _psapi.GetProcessMemoryInfo(_k32.GetCurrentProcess(), ctypes.byref(c), c.cb)
    return "ws=%dMB peak=%dMB priv=%dMB sysAvail=%dMB" % (
        c.WorkingSetSize >> 20, c.PeakWorkingSetSize >> 20, c.PrivateUsage >> 20, sys_avail_mb())


def log(*a):
    s = "[%7.1fs] " % (time.time() - T0) + " ".join(str(x) for x in a)
    print(s)
    LOG.write(s + "\n")
    LOG.flush()


scene = bpy.context.scene
log("loaded", mem())

RINGS = ["Circle.025", "Circle.026", "Circle.027", "Circle.028", "Circle.029", "Circle.030", "Circle.031", "Circle.032"]
HERO = RINGS + ["Icosphere.011", "Cube.009", "Cube.010"]
CLOUDS = [o.name for o in bpy.data.objects if o.name.startswith("pngimg.com")]
ORB_C = bpy.data.objects["Icosphere.011"].matrix_world.translation.copy()

REST = {"loc": (0.23183887899931777, -11.787528905312952, 2.903973052988094),
        "yaw": 0.672220988573093, "pitch": -0.048456561917928444, "lens": 42.253045166243865}
if CAMSEL in ("hold", "orbN", "orbP", "orbU", "tilt"):
    # Same construction as CameraRig.apply: spherical offset from the orb (three.js Y-up), lookAt, then the
    # absolute pitch; converted to Blender (x, -z, y). Same lens and overscan as the rest plate.
    # hold = CAM_TARGETS.expand at the rest azimuth; orbN / orbP = the rest pose orbited to -5 / +5 deg (the
    # pointer's extremes; PlateEnvironment.createProjectorCamera).
    if CAMSEL == "hold":
        _r, _az, _el, _pitch = 12.7, math.radians(0.64), math.radians(-3.3), 4.55
    elif CAMSEL == "tilt":
        # The hover push-in (pointer over the orb, CAM_TARGETS.tilt at the rest azimuth): dolly in, lower, pitch up.
        _r, _az, _el, _pitch = 18.7, math.radians(0.64), math.radians(-1.43), 1.5
    elif CAMSEL == "orbU":
        # The pointer's top extreme: +1.2 deg of elevation (Choreography orbitEl), same absolute pitch.
        _r, _az, _el, _pitch = 20.93, math.radians(0.64), math.radians(-0.41 + 1.2), -0.048
    else:
        _r, _az, _el, _pitch = 20.93, math.radians(0.64 + (5.0 if CAMSEL == "orbP" else -5.0)), math.radians(-0.41), -0.048
    _orb = bpy.data.objects["Icosphere.011"].matrix_world.translation
    _off3 = (_r * math.cos(_el) * math.sin(_az), _r * math.sin(_el), _r * math.cos(_el) * math.cos(_az))
    _loc = (_orb.x + _off3[0], _orb.y - _off3[2], _orb.z + _off3[1])
    _yaw = math.degrees(math.atan2(-(_orb.x - _loc[0]), _orb.y - _loc[1]))
    REST = {"loc": _loc, "yaw": _yaw, "pitch": _pitch, "lens": REST["lens"]}
# Overscan per side as a fraction of the reference frame width / height. The orbit needs about
# +-5 deg of yaw (>= 11 % left/right), the hold dolly pitches up ~4.6 deg (>= 18 % top).
# v2: more bottom / side overscan (QC round 4: with the pointer low the camera ran off the plate's bottom edge and the
# clamped last row drew a pale flat band across the frame bottom).
OX = 0.15
OY_TOP, OY_BOT = 0.20, 0.13
OY = (OY_TOP + OY_BOT) / 2   # mean, for the total height
# Plates render as horizontal border strips ("strip:i:n", i = 0 is the bottom) so the OIDN buffers
# fit in RAM (two halves still pushed the laptop under 700 MB available). Strips overlap by
# OVERLAP_PX and share one fixed PNG exposure (from the probe: p99.9 = 4.33 linear -> -2.158 stops).
STRIP = None
if MODE.startswith("strip:"):
    _, si, sn = MODE.split(":")
    STRIP = (int(si), int(sn))
# "crop:x0:y0:x1:y1": a full-resolution border render of a region (normalized, y from the BOTTOM), for checking a fix in
# the scene without rendering whole plates.
CROP = None
if MODE.startswith("crop:"):
    CROP = tuple(float(v) for v in MODE.split(":")[1:5])
SCALE = 0.25 if MODE == "probe" else (0.5 if MODE == "probe50" else (1.25 if (STRIP or CROP) else 1.0))
OVERLAP_PX = 32
PLATE_EXPO = -2.158

# ---- scene state for an environment-only plate
for n in HERO:
    bpy.data.objects[n].hide_render = True
for n in CLOUDS:
    o = bpy.data.objects[n]
    o.visible_camera = MODE == "pano"     # pano sees clouds directly; plates get live clouds instead
    o.visible_glossy = True                 # keep them in the water reflections
wave = bpy.data.objects["Plane.011"].modifiers.get("Wave")
if wave:
    wave.show_render = False                # calm water: live ripples are added in WebGL
# Memory: the three far mountains are 524k triangles each (85 % of the BVH). At their screen size a
# 12 % decimation is visually identical (detail lives in the texture) and keeps Blender under ~1 GB.
for o in bpy.data.objects:
    # plate_scene.blend (prep_plate_scene.py) already carries decimated mountains.
    if o.name.startswith("Object_2") and o.type == 'MESH' and len(o.data.polygons) > 200000:
        d = o.modifiers.new("RENDER_DECIMATE", 'DECIMATE')
        d.decimate_type = 'COLLAPSE'
        d.ratio = 0.12
        d.use_collapse_triangulate = True
scene.frame_set(1)

# ---- camera
cd = bpy.data.cameras.new("__plate_cam__")
cam = bpy.data.objects.new("__plate_cam__", cd)
scene.collection.objects.link(cam)
cam.rotation_mode = 'XYZ'
cd.clip_start = 0.05
cd.clip_end = 5000.0
if MODE == "pano":
    cd.type = 'PANO'
    try:
        cd.panorama_type = 'EQUIRECTANGULAR'
    except Exception:
        cd.cycles.panorama_type = 'EQUIRECTANGULAR'
    cam.rotation_euler = Euler((math.radians(90.0), 0.0, math.radians(-90.0)), 'XYZ')
    cam.location = ORB_C
    W, H = 1024, 512
else:
    cd.sensor_fit = 'HORIZONTAL'
    cd.sensor_width = 36.0
    cd.lens = REST["lens"] / (1.0 + 2.0 * OX)
    cam.rotation_euler = Euler((math.radians(90.0 + REST["pitch"]), 0.0, math.radians(REST["yaw"])), 'XYZ')
    cam.location = REST["loc"]
    W = int(round(1440 * SCALE * (1.0 + 2.0 * OX)))
    H = int(round(766 * SCALE * (1.0 + 2.0 * OY)))
    # Asymmetric vertical overscan via lens shift (units of the plate width for a horizontal fit).
    cd.shift_x = 0.0
    # The plate centre sits half the margin difference above the rest-frame centre.
    cd.shift_y = 0.5 * (OY_TOP - OY_BOT) * 766 * SCALE / W
scene.camera = cam

# ---- render settings (CPU, memory-frugal)
r = scene.render
cy = scene.cycles
r.engine = 'CYCLES'
cy.device = 'CPU'
r.resolution_x, r.resolution_y, r.resolution_percentage = W, H, 100
r.film_transparent = MODE != "pano"
r.use_simplify = True
r.simplify_subdivision_render = 3
cy.texture_limit_render = '1024'
cy.use_auto_tile = True
cy.tile_size = 1024
cy.use_adaptive_sampling = True
if MODE in ("probe", "probe50"):
    cy.samples, cy.adaptive_threshold, cy.adaptive_min_samples = 16, 0.05, 8
elif MODE == "pano":
    cy.samples, cy.adaptive_threshold, cy.adaptive_min_samples = 64, 0.03, 16
else:
    cy.samples, cy.adaptive_threshold, cy.adaptive_min_samples = 64, 0.03, 16
cy.use_denoising = True
cy.denoiser = 'OPENIMAGEDENOISE'
cy.denoising_input_passes = 'RGB_ALBEDO_NORMAL'
cy.denoising_prefilter = 'ACCURATE' if MODE.startswith("probe") else 'FAST'
cy.max_bounces = 6
cy.diffuse_bounces = 2
cy.glossy_bounces = 3
cy.transmission_bounces = 4
cy.transparent_max_bounces = 6
cy.volume_bounces = 0
log("camera", CAMSEL, json.dumps({k: (list(v) if isinstance(v, tuple) else v) for k, v in REST.items()}))
cy.caustics_reflective = False
cy.caustics_refractive = False
cy.sample_clamp_indirect = 10.0
scene.view_settings.view_transform = scene.view_settings.view_transform  # keep file setting for the record
cm = {"view_transform": scene.view_settings.view_transform, "look": scene.view_settings.look,
      "exposure": scene.view_settings.exposure, "gamma": scene.view_settings.gamma,
      "display": scene.display_settings.display_device}
log("mode", MODE, "res", W, H, "lens", round(cd.lens, 4) if MODE != "pano" else "pano", "color mgmt", cm)

if sys_avail_mb() < 1200:
    log("ABORT: system available RAM below 1200 MB before render")
    sys.exit(2)

if STRIP:
    name = "plate_%s_s%d" % (CAMSEL, STRIP[0])
elif CROP:
    name = "plate_crop_%s" % CAMSEL
else:
    name = {"probe": "plate_probe_" + CAMSEL, "probe50": "plate_probe50_" + CAMSEL, "pano": "pano_orb"}[MODE]
FULL_W, FULL_H = W, H
if STRIP:
    # Blender border coordinates are normalized with y measured from the bottom of the frame.
    si, sn = STRIP
    ov = OVERLAP_PX / H
    r.use_border = True
    r.use_crop_to_border = True
    r.border_min_x, r.border_max_x = 0.0, 1.0
    r.border_min_y = max(0.0, si / sn - (ov if si > 0 else 0.0))
    r.border_max_y = min(1.0, (si + 1) / sn + (ov if si < sn - 1 else 0.0))
    H = int(round((r.border_max_y - r.border_min_y) * FULL_H))
    log("border y", round(r.border_min_y, 5), round(r.border_max_y, 5), "crop height", H)
if CROP:
    r.use_border = True
    r.use_crop_to_border = True
    r.border_min_x, r.border_min_y, r.border_max_x, r.border_max_y = CROP
    log("crop border", CROP)
exr_path = os.path.join(OUT, name + ".exr")
r.image_settings.file_format = 'OPEN_EXR'
r.image_settings.color_mode = 'RGBA'
r.image_settings.color_depth = '16'
r.image_settings.exr_codec = 'ZIP'
r.filepath = exr_path
t = time.time()
bpy.ops.render.render(write_still=True)
log("render done in %.1fs" % (time.time() - t), mem())

# ---- stats + auto exposure for the 8/16-bit web version
img = bpy.data.images.load(exr_path)
W, H = img.size[0], img.size[1]
px = np.empty(W * H * 4, dtype=np.float32)
img.pixels.foreach_get(px)
px = px.reshape(H, W, 4)
rgbmax = px[..., :3].max(axis=2)
alpha = px[..., 3]
valid = rgbmax[alpha > 0.5] if (alpha > 0.5).any() else rgbmax.ravel()
p50, p99, p999, pmax = [float(np.percentile(valid, q)) for q in (50, 99, 99.9, 100)]
expo_stops = math.log2(0.97 / max(p999, 1e-4))
expo_stops = max(min(expo_stops, 2.0), -4.0)
if STRIP or CROP:
    expo_stops = PLATE_EXPO
info = {"name": name, "mode": MODE, "width": W, "height": H, "full_width": FULL_W, "full_height": FULL_H,
        "border_y": [r.border_min_y, r.border_max_y] if r.use_border else None, "overlap_px": OVERLAP_PX,
        "overscan": {"x": OX, "top": OY_TOP, "bottom": OY_BOT, "shift_y": cd.shift_y} if MODE != "pano" else None,
        "camera": {"location_blender": list(cam.location), "rotation_euler_deg": [math.degrees(a) for a in cam.rotation_euler],
                   "lens_mm": cd.lens if MODE != "pano" else None, "sensor_mm": 36.0, "sensor_fit": "HORIZONTAL"},
        "linear_stats": {"p50": p50, "p99": p99, "p99.9": p999, "max": pmax,
                         "alpha_mean": float(alpha.mean()), "alpha_zero_frac": float((alpha < 0.01).mean())},
        "png_exposure_stops": expo_stops,
        "png_decode": "linear = srgb_to_linear(png) * 2^(-png_exposure_stops)  (Standard view, sRGB display)",
        "color_management_in_file": cm, "render_seconds": time.time() - t}
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
scene.view_settings.exposure = expo_stops
scene.view_settings.gamma = 1.0
r.image_settings.file_format = 'PNG'
r.image_settings.color_mode = 'RGBA'
r.image_settings.color_depth = '16'
r.image_settings.compression = 15
img.save_render(os.path.join(OUT, name + ".png"), scene=scene)
with open(os.path.join(OUT, name + ".json"), "w", encoding="utf-8") as f:
    json.dump(info, f, indent=1)
log("saved png + json", json.dumps(info["linear_stats"]), "expo", round(expo_stops, 3), mem())
log("ALLDONE")
LOG.close()
