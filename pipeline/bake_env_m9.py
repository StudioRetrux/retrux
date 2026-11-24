# Baked environment v9 (round 11, ENV lane; macOS, Blender 5.2, Cycles on the Metal GPU). Successor of bake_env_m8.py.
# Every environment surface gets ONE texture in its own UV space (no camera-projected plates at runtime, so no camera move
# can double anything). The colour is composited outside Blender by comp_env_m9.py (numpy) from the Cycles plates; this
# script prepares the shipped meshes and every input the compositor needs. Never saves over the source .blend.
#
# Fixes against m8 (root causes, see notes in WORK/LOG.md and LANE/HANDOFF.md):
#   * the light bake keeps the materials' own UV maps (m8 deleted them, so every texture was sampled with the bake UVs);
#   * visibility is tested against the SHIPPED meshes (the engine's geometry), rendered at full plate resolution, with a
#     bilinear depth test (no N.V gate: grazing shore and floes were rejected by m8);
#   * only faces under the engine's opaque lake are deleted (m8 deleted everything below z -0.05 and cut the far ranges);
#   * texel density from the views that really see each face (plates and engine probe views), hidden faces shrunk.
#
#   blender -b <scene.blend> --python bake_env_m9.py -- <outDir> stage=<stage> [k=v ...]
# stages (one Blender session each; run them in order, see run_bake_m9.zsh):
#   prep    open plate_scene_v7 (copy): original-geometry rest maps (evidence), meshes prepared -> <out>/prep_scene.blend
#   maps    open prep_scene.blend: per camera (plates + probes) a distance map of the shipped meshes + the engine water
#           occluder -> <out>/maps/<cam>.npy and <out>/cams.json
#   uv      open prep_scene.blend: per-face visibility + texel need, BakeUV unwrap and pack -> <out>/bake_scene.blend
#   raster  open bake_scene.blend: per object texel world position / normal / coverage -> <out>/raster/<obj>.npz
#   light   open bake_scene.blend: Cycles COMBINED light bake per object (Metal) -> <out>/light/<obj>.exr
#   export  open bake_scene.blend: env_baked.glb (bake UV as TEXCOORD_0, Draco) -> <out>/env_baked.glb
# flags: only=A,B  plates=<dir of plate_*.exr/json>  xplates=<a.json,b.json> (extra plates)  spp=128  lsize=1024
#        tscale=1.0  hid=0.2  device=METAL|CPU
import bpy, bmesh, json, math, os, sys, time, gc
import numpy as np
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from env_repair import repair

ARGV = sys.argv[sys.argv.index("--") + 1:]
OUT = os.path.abspath(ARGV[0])
FLAGS = dict(a.split("=", 1) for a in ARGV[1:] if "=" in a)
STAGE = FLAGS.get("stage", "prep")
ONLY = [n for n in FLAGS.get("only", "").split(",") if n]
PLATES = FLAGS.get("plates", os.path.join(os.path.dirname(HERE), "blender", "plates_v7"))
XPLATES = [p for p in FLAGS.get("xplates", "").split(",") if p]
SPP = int(FLAGS.get("spp", 128))
LSIZE = int(FLAGS.get("lsize", 1024))
TSCALE = float(FLAGS.get("tscale", 1.0))
HID = float(FLAGS.get("hid", 0.2))
DEVICE = FLAGS.get("device", "METAL")
MAPS = os.path.join(OUT, "maps")
for d in (OUT, MAPS, os.path.join(OUT, "raster"), os.path.join(OUT, "light")):
    os.makedirs(d, exist_ok=True)
LOGF = open(os.path.join(OUT, "bake_log.txt"), "a", encoding="utf-8")
T0 = time.time()


def log(*a):
    s = time.strftime("%H:%M:%S ") + "[%s] " % STAGE + " ".join(str(x) for x in a)
    print(s)
    LOGF.write(s + "\n")
    LOGF.flush()


sc = bpy.context.scene
cy = sc.cycles
sc.render.engine = 'CYCLES'
if DEVICE == "METAL":
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    for d in prefs.devices:
        d.use = d.type == 'METAL'
    cy.device = 'GPU'
else:
    cy.device = 'CPU'
# The plates' render look (render_plates_v3.py / render_plates_m9.py; audit A1 #8).
for k, v in dict(texture_limit_render='1024', max_bounces=6, diffuse_bounces=2, glossy_bounces=3, transmission_bounces=4,
                 transparent_max_bounces=6, volume_bounces=0, caustics_reflective=False, caustics_refractive=False,
                 sample_clamp_indirect=10.0).items():
    try:
        setattr(cy, k, v)
    except Exception as ex:
        print("cycles setting", k, ex)
sc.render.use_simplify = True
sc.render.simplify_subdivision_render = 3
sc.frame_set(1)

RINGS = ["Circle.025", "Circle.026", "Circle.027", "Circle.028", "Circle.029", "Circle.030", "Circle.031", "Circle.032"]
HERO = RINGS + ["Icosphere.011", "Cube.009", "Cube.010"]
CLOUDS = [o.name for o in bpy.data.objects if o.name.startswith("pngimg.com")]
WATER = ["Plane.011", "Plane.013"]
VOLUMES = [o.name for o in bpy.data.objects if o.name.startswith("V2_") and o.name not in ("V2_Ridge", "V2_Massif")]
SKIP = set(HERO + CLOUDS + WATER + VOLUMES)
for n in HERO:
    if n in bpy.data.objects:
        bpy.data.objects[n].hide_render = True       # the plates were rendered without the hero
for n in CLOUDS:
    o = bpy.data.objects[n]
    o.visible_camera = False                          # as the plates: camera-invisible, glossy-visible
    o.visible_glossy = True
for o in bpy.data.objects:
    for m in o.modifiers:
        if m.type == 'WAVE':
            m.show_render = False                     # calm water, as the plates
ENV = [o for o in bpy.data.objects if o.type == 'MESH' and o.name not in SKIP and not o.name.startswith("__")]
ENV_NAMES = [o.name for o in ENV]
_OBJ_JSON = os.path.join(OUT, "objects.json")
if not ONLY and STAGE != "prep" and os.path.exists(_OBJ_JSON):
    ONLY = json.load(open(_OBJ_JSON, encoding="utf-8"))
TODO = [o for o in ENV if not ONLY or o.name in ONLY]

# The engine's opaque lake (config.ts WATER, Blender coords): only faces entirely under it are never seen.
LAKE = [(-14.871797561645508, 14.871797561645508, -14.871797561645508, 14.871797561645508),
        (-22.307697296142578, 22.307697296142578, 11.920909881591797, 56.53630065917969)]


def under_lake(x, y):
    return any(a <= x <= b and c <= y <= d for a, b, c, d in LAKE)


def budget(name):
    # Triangle budgets (shipped meshes): silhouettes must hold at the hold dolly.
    if name in ("V2_Massif", "V2_Ridge", "BG.001"):
        return 10 ** 9
    if name.startswith("Object_2"):
        return 24000
    if name.startswith("gfsw"):
        return 12000
    if name == "Plane.015":
        return 12000
    if name.startswith("Plane.0"):
        return 8000
    if name.startswith("Retopo_Plane"):
        return 8000
    return 5000


# ---------------------------------------------------------------------------------------------------- cameras
OX, OY_TOP, OY_BOT = 0.15, 0.20, 0.13
REST_LENS = 42.253045166243865
ORB = Vector((0.0, 9.137568473815918, 3.0538065433502197))
PLATE_W, PLATE_H = 2340, 1273
SHIFT_Y = 0.5 * (OY_TOP - OY_BOT) * 766 * 1.25 / PLATE_W


def rig_pose(r, az, el, pitch):
    off3 = (r * math.cos(math.radians(el)) * math.sin(math.radians(az)), r * math.sin(math.radians(el)),
            r * math.cos(math.radians(el)) * math.cos(math.radians(az)))
    loc = (ORB.x + off3[0], ORB.y - off3[2], ORB.z + off3[1])
    yaw = math.degrees(math.atan2(-(ORB.x - loc[0]), ORB.y - loc[1]))
    return loc, (90.0 + pitch, 0.0, yaw)


def holdk(c):
    s = min(1.0, c / 0.35)
    return 1.0 - 0.8 * s * s * (3.0 - 2.0 * s)


def probe_specs():
    # Engine views sampled over the camera envelope (CameraRig.update / CAM_TARGETS): orbit arc, hover tilt, collapse,
    # hold (with its 20 % orbit), the dolly path at the pointer extremes, the intro. Plate lens / overscan frustum (it
    # contains the engine frame plus its +-0.9 deg pan), half the plate resolution.
    R0, AZ0, EL0, P0 = 20.93, 0.64, -0.41, -0.048
    P = {}
    for a in (-5.0, -2.5, 0.0, 2.5, 5.0):
        P["p_orb%+.1f" % a] = (R0, AZ0 + a, EL0, P0)
    for a in (-2.0, 0.0, 2.0):
        P["p_tilt%+.1f" % a] = (18.7, AZ0 + a, -1.43, 1.5)
    P["p_coll"] = (19.5, AZ0, -1.0, 1.45)
    for a in (-1.0, 0.0, 1.0):
        P["p_hold%+.1f" % a] = (12.7, AZ0 + a, -3.3, 4.55 + 0.75)
    for c in (0.1, 0.25, 0.5, 0.75):
        r = R0 + (12.7 - R0) * c
        el = EL0 + (-3.3 - EL0) * c
        p = P0 + (4.55 + 0.75 - P0) * c
        for sgn in (-1, 1):
            P["p_dolly%.2f%s" % (c, "N" if sgn < 0 else "P")] = (r, AZ0 + sgn * 5.0 * holdk(c), el, p)
    P["p_intro"] = (17.6, AZ0, -2.1, 2.4)
    return P


def plate_specs():
    specs = []
    for k in ("rest", "tilt", "hold", "orbN", "orbP"):
        jp = os.path.join(PLATES, "plate_%s.json" % k)
        if os.path.exists(jp):
            specs.append(("plate_" + k, jp))
    for jp in XPLATES:
        specs.append((os.path.splitext(os.path.basename(jp))[0], jp))
    return specs


def make_camera(name, loc, rot_deg, lens, shift_y, W, H):
    cd = bpy.data.cameras.new("cam_" + name)
    cd.sensor_fit = 'HORIZONTAL'
    cd.sensor_width = 36.0
    cd.lens = lens
    cd.shift_x = 0.0
    cd.shift_y = shift_y
    cd.clip_start = 0.05
    cd.clip_end = 5000.0
    co = bpy.data.objects.new("cam_" + name, cd)
    co.rotation_mode = 'XYZ'
    co.location = Vector(loc)
    co.rotation_euler = [math.radians(v) for v in rot_deg]
    sc.collection.objects.link(co)
    bpy.context.view_layer.update()
    Pm = np.array(co.calc_matrix_camera(bpy.context.evaluated_depsgraph_get(), x=W, y=H, scale_x=1.0, scale_y=1.0))
    V = np.array(co.matrix_world.inverted())
    return {"name": name, "W": W, "H": H, "PV": (Pm @ V).tolist(), "pos": list(co.matrix_world.translation), "obj": co}


def all_cameras(kinds=("plate", "probe")):
    cams = []
    if "plate" in kinds:
        for name, jp in plate_specs():
            meta = json.load(open(jp, encoding="utf-8"))
            c = meta["camera"]
            cam = make_camera(name, c["location_blender"], c["rotation_euler_deg"], c["lens_mm"], meta["overscan"]["shift_y"],
                              meta.get("width", PLATE_W), meta.get("height", PLATE_H))
            cam["kind"] = "plate"
            cam["hold"] = 1.0 if name == "plate_hold" else float(meta.get("hold", 0.0))
            ex = os.path.splitext(jp)[0] + ".exr"
            cam["exr"] = ex if os.path.exists(ex) else None
            cams.append(cam)
    if "probe" in kinds:
        for name, (r, az, el, p) in probe_specs().items():
            loc, rot = rig_pose(r, az, el, p)
            cam = make_camera(name, loc, rot, REST_LENS / (1.0 + 2.0 * OX), SHIFT_Y, PLATE_W // 2, (PLATE_H + 1) // 2)
            cam["kind"] = "probe"
            cam["rig"] = [r, az, el, p]
            cam["hold"] = 1.0 if name.startswith("p_hold") else (float(name[7:11]) if name.startswith("p_dolly") else 0.0)
            cams.append(cam)
    return cams


# ---------------------------------------------------------------------------------------------------- render helpers
SMIN = np.array([-500.0, -500.0, -150.0])
SSIZE = np.array([1000.0, 1000.0, 450.0])


def emit_material(kind):
    # Emission of the world position (mapped into SMIN..SMIN+SSIZE) or of the object pass index / 1000.
    m = bpy.data.materials.new("__aux_" + kind)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    if kind == "pos":
        geo = nt.nodes.new('ShaderNodeNewGeometry')
        v1 = nt.nodes.new('ShaderNodeVectorMath')
        v1.operation = 'SUBTRACT'
        v1.inputs[1].default_value = tuple(SMIN)
        v2 = nt.nodes.new('ShaderNodeVectorMath')
        v2.operation = 'DIVIDE'
        v2.inputs[1].default_value = tuple(SSIZE)
        nt.links.new(geo.outputs['Position'], v1.inputs[0])
        nt.links.new(v1.outputs[0], v2.inputs[0])
        nt.links.new(v2.outputs[0], em.inputs['Color'])
    else:
        oi = nt.nodes.new('ShaderNodeObjectInfo')
        mth = nt.nodes.new('ShaderNodeMath')
        mth.operation = 'DIVIDE'
        mth.inputs[1].default_value = 1000.0
        nt.links.new(oi.outputs['Object Index'], mth.inputs[0])
        nt.links.new(mth.outputs[0], em.inputs['Color'])
    em.inputs['Strength'].default_value = 1.0
    nt.links.new(em.outputs[0], out.inputs['Surface'])
    return m


def read_exr_rgba(fp):
    img = bpy.data.images.load(fp)
    w, h = img.size
    a = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(a)
    bpy.data.images.remove(img)
    return a.reshape(h, w, 4)                          # rows from the BOTTOM (Blender convention)


def render_aux(cam, kind, fp):
    # One aux render (1 spp, ~0 filter width, transparent film), volumes and clouds hidden (they are not surfaces).
    vl = bpy.context.view_layer
    hidden = []
    for o in bpy.data.objects:
        if (o.name in VOLUMES or o.name in CLOUDS) and not o.hide_render:
            o.hide_render = True
            hidden.append(o)
    keep = dict(samples=cy.samples, filt=cy.filter_width, film=sc.render.film_transparent, rx=sc.render.resolution_x,
                ry=sc.render.resolution_y, rp=sc.render.resolution_percentage, cam=sc.camera,
                fmt=sc.render.image_settings.file_format, depth=sc.render.image_settings.color_depth, path=sc.render.filepath,
                ovr=vl.material_override, den=cy.use_denoising, adapt=cy.use_adaptive_sampling, border=sc.render.use_border)
    mat = emit_material(kind)
    cy.samples = 1
    cy.use_denoising = False
    cy.use_adaptive_sampling = False
    cy.filter_width = 0.01
    sc.render.film_transparent = True
    sc.render.use_border = False
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = cam["W"], cam["H"], 100
    sc.render.image_settings.file_format = 'OPEN_EXR'
    sc.render.image_settings.color_depth = '32'
    sc.render.filepath = fp
    sc.camera = cam["obj"]
    vl.material_override = mat
    bpy.ops.render.render(write_still=True)
    vl.material_override = keep["ovr"]
    cy.samples, cy.filter_width, sc.render.film_transparent = keep["samples"], keep["filt"], keep["film"]
    cy.use_denoising, cy.use_adaptive_sampling, sc.render.use_border = keep["den"], keep["adapt"], keep["border"]
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = keep["rx"], keep["ry"], keep["rp"]
    sc.camera, sc.render.image_settings.file_format, sc.render.filepath = keep["cam"], keep["fmt"], keep["path"]
    sc.render.image_settings.color_depth = keep["depth"]
    for o in hidden:
        o.hide_render = False
    bpy.data.materials.remove(mat)
    a = read_exr_rgba(fp)
    os.remove(fp)
    return a


def pos_and_dist(cam, fp):
    a = render_aux(cam, "pos", fp)
    P = (a[:, :, :3] * SSIZE.astype(np.float32) + SMIN.astype(np.float32)).astype(np.float32)
    hit = a[:, :, 3] > 0.5
    D = np.linalg.norm(P - np.array(cam["pos"], dtype=np.float32)[None, None, :], axis=2)
    D[~hit] = np.inf
    return P, D.astype(np.float32), hit


def add_lake_occluder():
    # The engine draws an opaque lake at z = 0 over these quads (Water.ts): it hides everything under it.
    me = bpy.data.meshes.new("__lake_occluder")
    verts, faces = [], []
    for x0, x1, y0, y1 in LAKE:
        b = len(verts)
        verts += [(x0, y0, 0.0), (x1, y0, 0.0), (x1, y1, 0.0), (x0, y1, 0.0)]
        faces.append((b, b + 1, b + 2, b + 3))
    me.from_pydata(verts, [], faces)
    o = bpy.data.objects.new("__lake_occluder", me)
    sc.collection.objects.link(o)
    return o


# ---------------------------------------------------------------------------------------------------- geometry prep
def prep_geometry(o):
    t = time.time()
    dg = bpy.context.evaluated_depsgraph_get()
    eo = o.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(eo, preserve_all_data_layers=True, depsgraph=dg)
    # Freeze the texture space (Generated coordinates) at the evaluated mesh's, so deleting or decimating faces does not
    # move a procedural pattern in the light bake. The object transform is NOT applied (Object coordinates stay put).
    try:
        loc, size = tuple(eo.data.texspace_location), tuple(eo.data.texspace_size)
        me.use_auto_texspace = False
        me.texspace_location, me.texspace_size = loc, size
    except Exception as ex:
        log("  texspace", o.name, ex)
    o.modifiers.clear()
    old = o.data
    o.data = me                                        # single-user, modifiers applied, original UV layers KEPT
    if old.users == 0:
        bpy.data.meshes.remove(old)
    open_e = repair(o, 0.03, log=log)
    # Faces entirely under the engine's opaque lake are never seen (m8 deleted every face below z -0.05, also the far
    # ranges' lower slopes beyond the lake, which the rest view sees: the defect-3 cut).
    bm = bmesh.new()
    bm.from_mesh(me)
    Mw = o.matrix_world.copy()
    under = []
    for f in bm.faces:
        ws = [Mw @ v.co for v in f.verts]
        if all(p.z < -0.05 for p in ws):
            c = sum(ws, Vector()) / len(ws)
            if under_lake(c.x, c.y):
                under.append(f)
    if under:
        bmesh.ops.delete(bm, geom=under, context='FACES')
        bm.to_mesh(me)
        me.update()
    bm.free()
    n = len(me.polygons)
    b = budget(o.name)
    if n > b * 1.05:
        bpy.context.view_layer.objects.active = o
        for x in bpy.data.objects:
            x.select_set(False)
        o.select_set(True)
        m = o.modifiers.new("BAKE_DEC", 'DECIMATE')
        m.decimate_type = 'COLLAPSE'
        m.ratio = b / n
        m.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier="BAKE_DEC")
    log("PREP %-20s polys %6d -> %6d  underLake %5d  open %5d  uv %s  (%.1f s)" % (
        o.name, n, len(o.data.polygons), len(under), open_e, [u.name for u in o.data.uv_layers], time.time() - t))


# ---------------------------------------------------------------------------------------------------- visibility
def load_cams_json():
    return json.load(open(os.path.join(OUT, "cams.json"), encoding="utf-8"))


def project(cam, P):
    PV = np.asarray(cam["PV"], dtype=np.float64)
    hp = np.concatenate([P, np.ones((P.shape[0], 1))], axis=1) @ PV.T
    w = hp[:, 3:4]
    ndc = hp[:, :2] / np.where(np.abs(w) < 1e-9, 1e-9, w)
    px = (ndc * 0.5 + 0.5) * np.array([cam["W"], cam["H"]]) - 0.5    # pixel coords, rows from the bottom
    inside = (w[:, 0] > 0) & (px[:, 0] >= 1) & (px[:, 0] <= cam["W"] - 2) & (px[:, 1] >= 1) & (px[:, 1] <= cam["H"] - 2)
    return px, inside


def bilinear(img, px):
    H, W = img.shape[:2]
    x = np.clip(px[:, 0], 0, W - 1.001)
    y = np.clip(px[:, 1], 0, H - 1.001)
    x0 = np.floor(x).astype(np.int64)
    y0 = np.floor(y).astype(np.int64)
    fx = x - x0
    fy = y - y0
    if img.ndim == 3:
        fx = fx[:, None]
        fy = fy[:, None]
    return (img[y0, x0] * (1 - fx) + img[y0, x0 + 1] * fx) * (1 - fy) + (img[y0 + 1, x0] * (1 - fx) + img[y0 + 1, x0 + 1] * fx) * fy


def visible(cam, D, P):
    # Depth test against the camera's distance map of the shipped meshes: bilinear distance at the projected pixel (a
    # planar surface interpolates exactly; at an occlusion edge the mix of near and far rejects the far side).
    px, inside = project(cam, P)
    vis = np.zeros(len(P), dtype=bool)
    idx = np.nonzero(inside)[0]
    if len(idx):
        Dm = np.where(np.isfinite(D), D, 1e6).astype(np.float32)
        Ls = bilinear(Dm, px[idx])
        Lt = np.linalg.norm(P[idx] - np.asarray(cam["pos"])[None, :], axis=1)
        vis[idx] = Lt <= Ls * 1.003 + 0.03
    return vis, px, inside


# ---------------------------------------------------------------------------------------------------- UV
def face_samples(o):
    me = o.data
    me.calc_loop_triangles()
    nt = len(me.loop_triangles)
    tv = np.empty(nt * 3, dtype=np.int32)
    me.loop_triangles.foreach_get("vertices", tv)
    tp = np.empty(nt, dtype=np.int32)
    me.loop_triangles.foreach_get("polygon_index", tp)
    co = np.empty(len(me.vertices) * 3, dtype=np.float32)
    me.vertices.foreach_get("co", co)
    M = np.array(o.matrix_world, dtype=np.float64)
    co = co.reshape(-1, 3).astype(np.float64) @ M[:3, :3].T + M[:3, 3]      # world space
    tv = tv.reshape(-1, 3)
    A, B, C = co[tv[:, 0]], co[tv[:, 1]], co[tv[:, 2]]
    return A, B, C, tp


def unwrap_object(o, cams, dmaps):
    t = time.time()
    me = o.data
    A, B, C, tp = face_samples(o)
    npoly = len(me.polygons)
    area = 0.5 * np.linalg.norm(np.cross(B - A, C - A), axis=1)
    # 4 samples per triangle (centroid + 3 inner points), any visible -> the triangle is visible from that camera.
    bary = [(1 / 3, 1 / 3, 1 / 3), (0.7, 0.15, 0.15), (0.15, 0.7, 0.15), (0.15, 0.15, 0.7)]
    vis_plate = np.zeros(len(A), dtype=bool)
    vis_any = np.zeros(len(A), dtype=bool)
    need = np.zeros(len(A), dtype=np.float64)          # max texels per metre wanted (plate px per metre at that view)
    for cam in cams:
        D = dmaps[cam["name"]]
        scale = 1.0 if cam["kind"] == "plate" else 2.0  # probes are at half the plate resolution
        v = np.zeros(len(A), dtype=bool)
        for b in bary:
            Pp = A * b[0] + B * b[1] + C * b[2]
            vv, _, _ = visible(cam, D, Pp)
            v |= vv
        if cam["kind"] == "plate":
            vis_plate |= v
        vis_any |= v
        pa, ia = project(cam, A)
        pb, ib = project(cam, B)
        pc, ic = project(cam, C)
        # Largest screen stretch of the triangle (plate px per metre along its most magnified direction): a grazing
        # face needs its horizontal density even though its projected area is tiny (texels are isotropic).
        e1 = B - A
        l1 = np.linalg.norm(e1, axis=1)
        e1 = e1 / np.maximum(l1, 1e-9)[:, None]
        nrm = np.cross(B - A, C - A)
        nrm /= np.maximum(np.linalg.norm(nrm, axis=1), 1e-12)[:, None]
        e2 = np.cross(nrm, e1)
        cx_, cy_ = np.sum((C - A) * e1, 1), np.sum((C - A) * e2, 1)
        sb = (pb - pa) * scale
        sc_ = (pc - pa) * scale
        det = l1 * cy_
        ok = np.abs(det) > 1e-12
        det = np.where(ok, det, 1.0)
        # J = [sb sc] [[l1 cx], [0 cy]]^-1
        j11 = sb[:, 0] / l1.clip(1e-9)
        j21 = sb[:, 1] / l1.clip(1e-9)
        j12 = (sc_[:, 0] - j11 * cx_) / np.where(np.abs(cy_) > 1e-12, cy_, 1e-12)
        j22 = (sc_[:, 1] - j21 * cx_) / np.where(np.abs(cy_) > 1e-12, cy_, 1e-12)
        T = j11 ** 2 + j12 ** 2 + j21 ** 2 + j22 ** 2
        Dt = j11 * j22 - j12 * j21
        sig1 = np.sqrt(np.maximum(0.5 * (T + np.sqrt(np.maximum(T * T - 4 * Dt * Dt, 0))), 0))
        # The engine blurs this view by its DOF (lodDof, PlateEnvironment.ts): half of that blur is credited.
        hold = cam.get("hold", 0.0)
        cpos = np.asarray(cam["pos"])
        focus = float(np.linalg.norm(cpos - np.array(ORB)))
        dd = np.linalg.norm((A + B + C) / 3.0 - cpos[None, :], axis=1)
        def sstep(e0, e1_, x):
            t_ = np.clip((x - e0) / (e1_ - e0), 0, 1)
            return t_ * t_ * (3 - 2 * t_)
        rng = 30.0 + (10.0 - 30.0) * hold
        lod = 1.5 * sstep(0.0, rng, np.abs(dd - focus)) + 1.6 * (1.0 - sstep(8 + 10 * hold, 16 + 12 * hold, dd))
        dens = sig1 * np.power(2.0, -0.5 * lod)
        # (vertices in front of the camera, not necessarily inside the frame: BG.001's two triangles never are)
        PVm = np.asarray(cam["PV"], dtype=np.float64)
        fr = lambda X: (X @ PVm[3, :3] + PVm[3, 3]) > 0.05
        dens[~(v & fr(A) & fr(B) & fr(C) & ok)] = 0.0
        need = np.maximum(need, dens)
    fvis = np.zeros(npoly, dtype=bool)
    np.logical_or.at(fvis, tp, vis_any)
    fneed = np.zeros(npoly)
    np.maximum.at(fneed, tp, need)
    farea = np.zeros(npoly)
    np.add.at(farea, tp, area)
    # Target density: the 90th area-weighted percentile of the visible faces' need (outliers are tiny, very near faces).
    if fvis.any():
        nv = fneed[fvis]
        av = farea[fvis]
        order = np.argsort(nv)
        cw = np.cumsum(av[order]) / max(av.sum(), 1e-9)
        rho = float(nv[order][min(len(order) - 1, np.searchsorted(cw, 0.9))])
    else:
        rho = 1.0
    rho *= TSCALE
    a_vis = float(farea[fvis].sum())
    a_hid = float(farea[~fvis].sum())
    texels = (a_vis + a_hid * HID * HID) * rho * rho / 0.6        # 0.6: packing efficiency with margins
    cap = int(FLAGS.get("cap", 2048))
    size = int(min(max(math.ceil(math.sqrt(texels) / 64.0) * 64, 128), cap))
    if "size_" + o.name in FLAGS:
        size = int(FLAGS["size_" + o.name])
    # Bake UV: seams between faces any view sees and faces none sees, angle-based unwrap, hidden islands shrunk.
    if "bake" in me.uv_layers:
        me.uv_layers.remove(me.uv_layers["bake"])
    uvl = me.uv_layers.new(name="bake")
    me.uv_layers.active = uvl                          # the unwrap edits the active layer
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.faces.ensure_lookup_table()
    for e in bm.edges:
        lf = e.link_faces
        e.seam = bool(len(lf) == 2 and fvis[lf[0].index] != fvis[lf[1].index])
    bm.to_mesh(me)
    bm.free()
    for x in bpy.data.objects:
        x.select_set(False)
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    sc.tool_settings.use_uv_select_sync = True
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.unwrap(method='ANGLE_BASED', margin=0.001)
    bpy.ops.object.mode_set(mode='OBJECT')
    luv = np.empty(len(me.loops) * 2, dtype=np.float32)
    me.uv_layers["bake"].data.foreach_get("uv", luv)
    luv = luv.reshape(-1, 2)
    lt = np.empty(npoly, dtype=np.int32)
    me.polygons.foreach_get("loop_total", lt)
    lpoly = np.repeat(np.arange(npoly, dtype=np.int32), lt)
    hid_l = ~fvis[lpoly]
    if hid_l.any() and (~hid_l).any() and HID < 1.0:
        c = luv[hid_l].mean(axis=0)
        luv[hid_l] = c + (luv[hid_l] - c) * HID
        me.uv_layers["bake"].data.foreach_set("uv", luv.ravel())
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    margin = 8.0 / size
    ok = False
    for kw in (dict(rotate=True, scale=True, margin_method='FRACTION', margin=margin, shape_method='CONCAVE'),
               dict(rotate=True, scale=True, margin=margin)):
        try:
            bpy.ops.uv.pack_islands(**kw)
            ok = True
            break
        except Exception as ex:
            log("  pack_islands", kw, "failed:", ex)
    bpy.ops.object.mode_set(mode='OBJECT')
    # The materials keep sampling their textures with their own UV map (m8 removed it: the light bake read scrambled
    # textures). "bake" stays a second layer; only the export makes it the single TEXCOORD_0.
    for u in me.uv_layers:
        if u.name != "bake":
            u.active_render = True
            break
    luv = np.empty(len(me.loops) * 2, dtype=np.float32)
    me.uv_layers["bake"].data.foreach_get("uv", luv)
    luv = luv.reshape(-1, 2)
    # Crop the texture to the packed islands (+4 texels): same texel size, no empty strip (non-square is fine in WebGL2).
    lo = luv.min(axis=0) - 4.0 / size
    hi = luv.max(axis=0) + 4.0 / size
    wpx = int(math.ceil((hi[0] - lo[0]) * size / 4.0) * 4)
    hpx = int(math.ceil((hi[1] - lo[1]) * size / 4.0) * 4)
    luv = (luv - lo) * size / np.array([wpx, hpx], dtype=np.float64)
    me.uv_layers["bake"].data.foreach_set("uv", luv.astype(np.float32).ravel())
    o["bake_w"], o["bake_h"] = wpx, hpx
    o["bake_size"] = size
    o["bake_rho"] = rho
    o["bake_vis_share"] = float(a_vis / max(a_vis + a_hid, 1e-9))
    log("UV %-20s size %4d -> %dx%d  rho %.1f px/m  faces %d vis %.1f%% (plate-only %.1f%%)  area vis %.0f hid %.0f m2  uv bbox %s pack %s  (%.1f s)" % (
        o.name, size, o["bake_w"], o["bake_h"], rho, npoly, 100 * fvis.mean(), 100 * vis_plate.mean(), a_vis, a_hid,
        np.round([luv[:, 0].min(), luv[:, 1].min(), luv[:, 0].max(), luv[:, 1].max()], 3).tolist(), ok, time.time() - t))


# ---------------------------------------------------------------------------------------------------- raster
def raster_uv(o, Wt, Ht):
    # World position, flat world normal and coverage per texel centre of the "bake" UV map (rows from the bottom).
    me = o.data
    me.calc_loop_triangles()
    nv, nl, ntri = len(me.vertices), len(me.loops), len(me.loop_triangles)
    co = np.empty(nv * 3, dtype=np.float32)
    me.vertices.foreach_get("co", co)
    M = np.array(o.matrix_world, dtype=np.float64)
    Wv = (co.reshape(-1, 3).astype(np.float64) @ M[:3, :3].T + M[:3, 3]).astype(np.float64)
    tv = np.empty(ntri * 3, dtype=np.int32)
    me.loop_triangles.foreach_get("vertices", tv)
    tv = tv.reshape(-1, 3)
    tl = np.empty(ntri * 3, dtype=np.int32)
    me.loop_triangles.foreach_get("loops", tl)
    tl = tl.reshape(-1, 3)
    uv = np.empty(nl * 2, dtype=np.float32)
    me.uv_layers["bake"].data.foreach_get("uv", uv)
    uv = uv.reshape(-1, 2).astype(np.float64)
    A, B, C = Wv[tv[:, 0]], Wv[tv[:, 1]], Wv[tv[:, 2]]
    Nf = np.cross(B - A, C - A)
    Nf /= np.maximum(np.linalg.norm(Nf, axis=1), 1e-12)[:, None]
    U = uv[tl] * np.array([Wt, Ht], dtype=np.float64) - 0.5
    P = np.zeros((Ht, Wt, 3), dtype=np.float32)
    Nm = np.zeros((Ht, Wt, 3), dtype=np.float16)
    cov = np.zeros((Ht, Wt), dtype=bool)
    tid = np.full((Ht, Wt), -1, dtype=np.int32)
    lim = np.array([Wt - 1, Ht - 1])
    lo = np.clip(np.floor(U.min(axis=1)).astype(np.int64), 0, lim)
    hi = np.clip(np.ceil(U.max(axis=1)).astype(np.int64), 0, lim)
    for t in range(ntri):
        x0, y0 = lo[t]
        x1, y1 = hi[t]
        if x1 < x0 or y1 < y0:
            continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1, dtype=np.float64), np.arange(y0, y1 + 1, dtype=np.float64))
        (ax, ay), (bx, by), (cx, cyy) = U[t]
        den = (by - cyy) * (ax - cx) + (cx - bx) * (ay - cyy)
        if abs(den) < 1e-12:
            continue
        l0 = ((by - cyy) * (gx - cx) + (cx - bx) * (gy - cyy)) / den
        l1 = ((cyy - ay) * (gx - cx) + (ax - cx) * (gy - cyy)) / den
        l2 = 1.0 - l0 - l1
        ins = (l0 >= -1e-4) & (l1 >= -1e-4) & (l2 >= -1e-4)
        if not ins.any():
            continue
        yy = gy[ins].astype(np.int64)
        xx = gx[ins].astype(np.int64)
        P[yy, xx] = (l0[ins][:, None] * A[t] + l1[ins][:, None] * B[t] + l2[ins][:, None] * C[t]).astype(np.float32)
        Nm[yy, xx] = Nf[t]
        cov[yy, xx] = True
        tid[yy, xx] = t
    # Texels of the gutter right at an island edge (texel centre just outside every triangle) take the nearest
    # triangle's plane extrapolation in the compositor's dilation; nothing else to do here.
    return P, Nm, cov, tid


# ---------------------------------------------------------------------------------------------------- bake helpers
def with_active_image(o, img):
    added = []
    mats = [s.material for s in o.material_slots if s.material]
    if not mats:
        m = bpy.data.materials.new("bake_tmp_" + o.name)
        m.use_nodes = True
        o.data.materials.append(m)
        mats = [m]
    for m in mats:
        nt = m.node_tree
        n = nt.nodes.new('ShaderNodeTexImage')
        n.image = img
        nt.nodes.active = n
        added.append((m, n))
    return added


def drop_nodes(added):
    for m, n in added:
        try:
            m.node_tree.nodes.remove(n)
        except Exception:
            pass


def save_float_exr(arr_rgba, fp):
    h, w = arr_rgba.shape[:2]
    img = bpy.data.images.new("__save", w, h, alpha=True, float_buffer=True)
    img.colorspace_settings.name = 'Non-Color'
    img.pixels.foreach_set(arr_rgba.astype(np.float32).ravel())
    img.filepath_raw = fp
    img.file_format = 'OPEN_EXR'
    img.save()
    bpy.data.images.remove(img)


# ==================================================================================================== stages
log("START", "objects", len(TODO), "device", DEVICE, "blend", bpy.data.filepath)
if STAGE == "prep":
    # Evidence: the ORIGINAL (as-rendered) geometry's rest view (position + object index), before any edit.
    for i, o in enumerate(bpy.data.objects):
        o.pass_index = i + 1
    cams = all_cameras(("plate",))
    rest = [c for c in cams if c["name"] == "plate_rest"][0]
    P, D, hit = pos_and_dist(rest, os.path.join(MAPS, "_tmp.exr"))
    np.save(os.path.join(MAPS, "orig_rest_P.npy"), P)
    idm = render_aux(rest, "id", os.path.join(MAPS, "_tmp.exr"))
    np.save(os.path.join(MAPS, "orig_rest_id.npy"), np.round(idm[:, :, 0] * 1000).astype(np.int16))
    json.dump({o.name: o.pass_index for o in bpy.data.objects}, open(os.path.join(MAPS, "orig_ids.json"), "w"), indent=0)
    # The m8 visibility inputs for the evidence comparison (half-res position maps of the ORIGINAL geometry).
    for c in cams:
        c2 = dict(c)
        c2["W"], c2["H"] = c["W"] // 2, c["H"] // 2
        Ph, Dh, hh = pos_and_dist(c2, os.path.join(MAPS, "_tmp.exr"))
        np.save(os.path.join(MAPS, "m8_%s_P.npy" % c["name"]), Ph)
        np.save(os.path.join(MAPS, "m8_%s_A.npy" % c["name"]), hh)
    for c in cams:
        bpy.data.objects.remove(c["obj"])
    log("orig maps saved")
    for o in TODO:
        prep_geometry(o)
        gc.collect()
    json.dump([o.name for o in TODO], open(os.path.join(OUT, "objects.json"), "w"), indent=0)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "prep_scene.blend"), copy=True)
    log("PREP_SAVED", os.path.join(OUT, "prep_scene.blend"))

elif STAGE == "maps":
    for i, o in enumerate(bpy.data.objects):
        o.pass_index = i + 1
    occ = add_lake_occluder()
    occ.pass_index = 999
    cams = all_cameras()
    out = []
    for c in cams:
        t = time.time()
        P, D, hit = pos_and_dist(c, os.path.join(MAPS, "_tmp.exr"))
        np.save(os.path.join(MAPS, c["name"] + ".npy"), D)
        if c["name"] == "plate_rest":
            np.save(os.path.join(MAPS, "ship_rest_P.npy"), P)
            idm = render_aux(c, "id", os.path.join(MAPS, "_tmp.exr"))
            np.save(os.path.join(MAPS, "ship_rest_id.npy"), np.round(idm[:, :, 0] * 1000).astype(np.int16))
            json.dump({o.name: o.pass_index for o in bpy.data.objects}, open(os.path.join(MAPS, "ship_ids.json"), "w"), indent=0)
            # Registration check: the orb centre must land on rest plate px (1171.4, 653.1 from the top).
            px, _ = project(c, np.array([[0.0, 9.137568, 3.053807]]))
            log("orb -> rest plate px (%.1f, %.1f from top)" % (px[0, 0], c["H"] - 1 - px[0, 1]))
        e = {k: c[k] for k in ("name", "W", "H", "PV", "pos", "kind", "hold")}
        e["exr"] = c.get("exr")
        e["rig"] = c.get("rig")
        out.append(e)
        log("MAP %-18s %dx%d  hit %.1f%%  (%.1f s)" % (c["name"], c["W"], c["H"], 100 * float(hit.mean()), time.time() - t))
        gc.collect()
    json.dump(out, open(os.path.join(OUT, "cams.json"), "w"), indent=0)

elif STAGE == "uv":
    cams = load_cams_json()
    dmaps = {c["name"]: np.load(os.path.join(MAPS, c["name"] + ".npy")) for c in cams}
    for o in TODO:
        unwrap_object(o, cams, dmaps)
        gc.collect()
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "bake_scene.blend"), copy=True)
    log("UV_SAVED", os.path.join(OUT, "bake_scene.blend"))

elif STAGE == "raster":
    for o in TODO:
        t = time.time()
        Wt, Ht = int(o.get("bake_w", 512)), int(o.get("bake_h", 512))
        # rscale: texture resolution multiplier on the packed layout (the UV layout is resolution-independent; the
        # 8-texel island margins grow with it). Per object: rscale_<name>=. Capped at `cap` (default 2048) per axis.
        rs = float(FLAGS.get("rscale_" + o.name, FLAGS.get("rscale", 1.0)))
        capr = int(FLAGS.get("cap", 2048))
        f = min(rs, capr / float(max(Wt, Ht)))
        Wt, Ht = max(16, int(round(Wt * f / 4.0)) * 4), max(16, int(round(Ht * f / 4.0)) * 4)
        P, N, cov, tid = raster_uv(o, Wt, Ht)
        np.savez_compressed(os.path.join(OUT, "raster", o.name + ".npz"), P=P, N=N, cov=cov, tid=tid,
                            size=int(o.get("bake_size", 512)), rho=float(o.get("bake_rho", 0)), vis_share=float(o.get("bake_vis_share", 0)))
        log("RASTER %-20s %dx%d  cover %.1f%%  (%.1f s)" % (o.name, Wt, Ht, 100 * float(cov.mean()), time.time() - t))
        del P, N, cov, tid
        gc.collect()

elif STAGE == "light":
    cy.samples = SPP
    cy.use_denoising = False
    sc.render.bake.margin = 16
    sc.render.bake.margin_type = 'EXTEND'
    for o in TODO:
        t = time.time()
        Wt, Ht = int(o.get("bake_w", 512)), int(o.get("bake_h", 512))
        f = min(1.0, LSIZE / float(max(Wt, Ht)))
        lw, lh = max(16, int(round(Wt * f))), max(16, int(round(Ht * f)))
        img = bpy.data.images.new("lit_" + o.name, lw, lh, alpha=True, float_buffer=True)
        img.colorspace_settings.name = 'Non-Color'
        added = with_active_image(o, img)
        for x in bpy.data.objects:
            x.select_set(False)
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.bake(type='COMBINED', uv_layer="bake", target='IMAGE_TEXTURES', margin=16, use_clear=True)
        a = np.empty(lw * lh * 4, dtype=np.float32)
        img.pixels.foreach_get(a)
        drop_nodes(added)
        bpy.data.images.remove(img)
        save_float_exr(a.reshape(lh, lw, 4), os.path.join(OUT, "light", o.name + ".exr"))
        log("LIGHT %-20s %dx%d (of %dx%d)  %d spp  mean %s  (%.1f s)" % (o.name, lw, lh, Wt, Ht, SPP,
            np.round(a.reshape(-1, 4)[:, :3].mean(0), 3).tolist(), time.time() - t))
        gc.collect()

elif STAGE == "export":
    keep = [o for o in ENV if os.path.exists(os.path.join(OUT, "tex", o.name + ".exr")) or "all" in FLAGS.get("export", "")]
    if not keep:
        keep = ENV
    for o in keep:
        me = o.data
        for u in [u for u in me.uv_layers if u.name != "bake"]:
            me.uv_layers.remove(u)
        if "bake" in me.uv_layers:
            me.uv_layers["bake"].active_render = True
            me.uv_layers.active = me.uv_layers["bake"]
    for x in bpy.data.objects:
        x.select_set(False)
    for o in keep:
        o.select_set(True)
        for s in o.material_slots:
            s.material = None
    bpy.context.view_layer.objects.active = keep[0]
    fp = os.path.join(OUT, "env_baked.glb")
    kw = dict(filepath=fp, export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_texcoords=True,
              export_normals=True, export_tangents=False, export_materials='NONE', export_cameras=False, export_lights=False,
              export_animations=False, export_extras=False, export_vertex_color='NONE',
              export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
              export_draco_position_quantization=14, export_draco_normal_quantization=10, export_draco_texcoord_quantization=14)
    op = bpy.ops.export_scene.gltf
    props = set(op.get_rna_type().properties.keys())
    res = op(**{k: v for k, v in kw.items() if k in props})
    log("EXPORT", res, len(keep), "objects", round(os.path.getsize(fp) / 1024, 1), "KB")
log("DONE %.0f s" % (time.time() - T0))
