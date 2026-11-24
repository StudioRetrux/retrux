# Retrux hero asset export (Blender 5.2, run headless, never saves the .blend).
#   blender -b --factory-startup -t 2 "Home - EXPORT.blend" --python export_assets.py -- <OUT_DIR>
# Produces in OUT_DIR:
#   hero.glb        rings (subsurf 2), orb, shard belts  (Y-up, no materials)
#   env_proxy.glb   decimated environment for plate projection (Draco)
#   scene.json      cameras, sun, water, clouds, sky backdrop, hero layout (Y-up)
#   sky_world_equirect.exr   world-only sky, three.js equirect convention
#   export_log.txt
import bpy, json, math, os, sys, time, ctypes
from ctypes import wintypes
from mathutils import Euler, Vector

OUT = sys.argv[sys.argv.index("--") + 1]
os.makedirs(OUT, exist_ok=True)
LOG = open(os.path.join(OUT, "export_log.txt"), "w", encoding="utf-8")
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


def mem():
    c = PMC()
    c.cb = ctypes.sizeof(c)
    _psapi.GetProcessMemoryInfo(_k32.GetCurrentProcess(), ctypes.byref(c), c.cb)
    m = MEMSTAT()
    m.dwLength = ctypes.sizeof(m)
    _k32.GlobalMemoryStatusEx(ctypes.byref(m))
    return "ws=%dMB peak=%dMB priv=%dMB sysAvail=%dMB" % (
        c.WorkingSetSize >> 20, c.PeakWorkingSetSize >> 20, c.PrivateUsage >> 20, m.ullAvailPhys >> 20)


def log(*a):
    s = "[%6.1fs] " % (time.time() - T0) + " ".join(str(x) for x in a)
    print(s)
    LOG.write(s + "\n")
    LOG.flush()


def yup(v):
    """Blender Z-up -> glTF / three.js Y-up."""
    return [float(v[0]), float(v[2]), float(-v[1])]


scene = bpy.context.scene
vl = bpy.context.view_layer
log("loaded", bpy.data.filepath, mem())

RINGS = ["Circle.025", "Circle.026", "Circle.027", "Circle.028", "Circle.029", "Circle.030", "Circle.031", "Circle.032"]
ORB = "Icosphere.011"
SHARDS = ["Cube.009", "Cube.010"]
HERO = RINGS + [ORB] + SHARDS
CLOUDS = sorted(o.name for o in bpy.data.objects if o.name.startswith("pngimg.com"))
WATER = ["Plane.011", "Plane.013"]
SKY_BG = "BG.001"

# Solved rest camera (from the video camera solve; the .blend has no camera).
REST_CAM = {"loc": [0.23183887899931777, -11.787528905312952, 2.903973052988094],
            "yaw_deg": 0.672220988573093, "pitch_deg": -0.048456561917928444,
            "lens_mm": 42.253045166243865, "sensor_mm": 36.0, "width": 1440, "height": 766}

SUN_DIR_BLENDER = [-0.8295, 0.45902, 0.31816]


def filt(op, kw):
    props = set(op.get_rna_type().properties.keys())
    dropped = [k for k in kw if k not in props]
    if dropped:
        log("gltf exporter: unsupported args dropped:", dropped)
    return {k: v for k, v in kw.items() if k in props}


def export_glb(path, names, draco):
    for o in bpy.data.objects:
        o.select_set(False)
    for n in names:
        bpy.data.objects[n].select_set(True)
    vl.objects.active = bpy.data.objects[names[0]]
    kw = dict(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
              export_texcoords=True, export_normals=True, export_tangents=False, export_materials='NONE',
              export_cameras=False, export_lights=False, export_animations=False, export_extras=False,
              export_vertex_color='NONE',
              export_draco_mesh_compression_enable=draco, export_draco_mesh_compression_level=6,
              export_draco_position_quantization=14, export_draco_normal_quantization=10,
              export_draco_texcoord_quantization=12)
    op = bpy.ops.export_scene.gltf
    res = op(**filt(op, kw))
    log("exported", os.path.basename(path), res, "%.1f KB" % (os.path.getsize(path) / 1024), mem())


def tri_count(obj):
    deps = bpy.context.evaluated_depsgraph_get()
    eo = obj.evaluated_get(deps)
    me = eo.to_mesh()
    me.calc_loop_triangles()
    n = len(me.loop_triangles)
    eo.to_mesh_clear()
    return n


# ---------------------------------------------------------------- hero.glb
for n in RINGS:
    for m in bpy.data.objects[n].modifiers:
        if m.type == 'SUBSURF':
            m.levels = max(m.levels, 2)
            m.render_levels = max(m.render_levels, 2)
export_glb(os.path.join(OUT, "hero.glb"), HERO, draco=False)

# ---------------------------------------------------------------- env_proxy.glb
def budget(name):
    if name.startswith("Object_2"):
        return 16000          # mountains: big silhouettes
    if name == SKY_BG:
        return 10 ** 9
    if name.startswith("gfsw"):
        return 6000
    if name == "Plane.015":
        return 8000           # iceberg on the right
    if name.startswith("Plane.0"):
        return 4000
    if name.startswith("Retopo_Plane"):
        return 5000
    if name in ("rock_big_3.004", "rock_big_3.005"):
        return 6000           # largest foreground rocks
    return 3000


env = [o for o in bpy.data.objects if o.type == 'MESH' and o.name not in HERO + CLOUDS + WATER]
env_report = []
for o in env:
    n = tri_count(o)
    target = budget(o.name)
    ratio = min(1.0, target / max(n, 1))
    if ratio < 0.98:
        d = o.modifiers.new("WEB_DECIMATE", 'DECIMATE')
        d.decimate_type = 'COLLAPSE'
        d.ratio = ratio
        d.use_collapse_triangulate = True
    env_report.append({"name": o.name, "tris_eval": n, "ratio": round(ratio, 4)})
log("env objects:", len(env), "total eval tris:", sum(e["tris_eval"] for e in env_report), mem())
export_glb(os.path.join(OUT, "env_proxy.glb"), [o.name for o in env], draco=True)
env_after = 0
for o in env:
    env_after += tri_count(o)
log("env tris after decimate:", env_after)

# ---------------------------------------------------------------- scene.json
def world_quad(name):
    o = bpy.data.objects[name]
    me = o.data
    verts = [yup(o.matrix_world @ v.co) for v in me.vertices]
    uvs = None
    if me.uv_layers.active:
        uvs = [None] * len(me.vertices)
        for poly in me.polygons:
            for li in poly.loop_indices:
                vi = me.loops[li].vertex_index
                uvs[vi] = list(me.uv_layers.active.data[li].uv)
    return {"verts": verts, "uvs": uvs, "faces": [list(p.vertices) for p in me.polygons]}


def bbox_yup(name):
    o = bpy.data.objects[name]
    pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
    mn = [min(p[i] for p in pts) for i in range(3)]
    mx = [max(p[i] for p in pts) for i in range(3)]
    a, b = yup(mn), yup(mx)
    return {"min": [min(a[i], b[i]) for i in range(3)], "max": [max(a[i], b[i]) for i in range(3)]}


clouds = []
for n in CLOUDS:
    o = bpy.data.objects[n]
    img = None
    mat = o.active_material
    if mat and mat.node_tree:
        for nd in mat.node_tree.nodes:
            if nd.type == 'TEX_IMAGE' and nd.image:
                img = os.path.basename(nd.image.filepath)
    q = world_quad(n)
    q.update({"name": n, "image": img})
    clouds.append(q)

wave = bpy.data.objects["Plane.011"].modifiers.get("Wave")
wave_d = None
if wave:
    wave_d = {k: getattr(wave, k) for k in ("time_offset", "damping_time", "falloff_radius", "start_position_x",
                                            "start_position_y", "speed", "height", "width", "narrowness",
                                            "use_cyclic", "use_x", "use_y")}
    wave_d["center_yup"] = yup([wave.start_position_x, wave.start_position_y, 0.0])

orb = bpy.data.objects[ORB]
data = {
    "units": "meters, three.js Y-up (x=bx, y=bz, z=-by)",
    "rest_camera_blender": REST_CAM,
    "rest_camera": {
        "position": yup(REST_CAM["loc"]),
        "yaw_deg": REST_CAM["yaw_deg"], "pitch_deg": REST_CAM["pitch_deg"],
        "lens_mm": REST_CAM["lens_mm"], "sensor_mm": 36.0, "sensor_fit": "HORIZONTAL",
        "aspect": REST_CAM["width"] / REST_CAM["height"],
        "hfov_deg": math.degrees(2 * math.atan(18.0 / REST_CAM["lens_mm"])),
    },
    "sun_dir": yup(SUN_DIR_BLENDER),
    "hero_center": yup(bpy.data.objects["Circle.028"].matrix_world.translation),
    "orb": {"center": yup(orb.matrix_world.translation), "radius": 0.8255},
    "rings": {n: {"matrix_world_translation": yup(bpy.data.objects[n].matrix_world.translation),
                  "rotation_euler_deg_blender": [math.degrees(a) for a in bpy.data.objects[n].rotation_euler]}
              for n in RINGS},
    "water": {"planes": {n: bbox_yup(n) for n in WATER}, "level_y": 0.0, "wave": wave_d},
    "sky_backdrop": world_quad(SKY_BG),
    "clouds": clouds,
    "env_objects": env_report,
    "world": {"sky_type": "SINGLE_SCATTERING", "background_strength": 0.4},
}
with open(os.path.join(OUT, "scene.json"), "w", encoding="utf-8") as f:
    json.dump(data, f, indent=1)
log("wrote scene.json")

# ---------------------------------------------------------------- world-only sky equirect
for o in scene.objects:
    o.hide_render = True
cd = bpy.data.cameras.new("__sky_pano__")
cd.type = 'PANO'
try:
    cd.panorama_type = 'EQUIRECTANGULAR'
except Exception:
    cd.cycles.panorama_type = 'EQUIRECTANGULAR'
cam = bpy.data.objects.new("__sky_pano__", cd)
scene.collection.objects.link(cam)
cam.rotation_mode = 'XYZ'
# yaw -90 deg: image centre = +X (three.js equirect convention), right of centre = -Y blender = +Z three.
cam.rotation_euler = Euler((math.radians(90.0), 0.0, math.radians(-90.0)), 'XYZ')
cam.location = orb.matrix_world.translation
cam.hide_render = False
scene.camera = cam
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 16
scene.cycles.use_denoising = False
scene.render.resolution_x = 1024
scene.render.resolution_y = 512
scene.render.resolution_percentage = 100
scene.render.film_transparent = False
scene.render.image_settings.file_format = 'OPEN_EXR'
scene.render.image_settings.color_depth = '16'
scene.render.image_settings.exr_codec = 'ZIP'
scene.render.filepath = os.path.join(OUT, "sky_world_equirect.exr")
log("rendering world sky equirect", mem())
bpy.ops.render.render(write_still=True)
log("sky done", mem())
log("ALLDONE")
LOG.close()
