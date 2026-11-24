# Real-geometry environment with BAKED textures (QC round 10 + the client: "kalo digerakin environment nya masih ada yang
# duplicate"): the camera-projected plates ghost whenever the camera leaves a projector. Here every environment surface
# gets ONE texture in its own UV space, so nothing can double from any view:
#   colour = the Cycles plates (rest, tilt, hold, orbN, orbP; scene-linear EXR, clouds camera-invisible) projected into the
#            texture wherever a plate camera really sees the texel (BVH ray cast against the as-rendered geometry, view
#            angle weighted, rest first), else a Cycles COMBINED bake of the same scene, colour-matched to the plates.
# Per object: modifiers applied, mesh repaired (weld + T-junctions, env_repair.py), decimated to a budget, one angle-based
# UV unwrap (no seams on the visible faces), packed with rotation. Outputs <out>/tex/<obj>.png (8-bit, the plates' encoding:
# srgb(linear * 2^-2.158)), <out>/env_baked.glb (positions, normals, the bake UV; Draco) and <out>/env_baked.json.
# Never saves the .blend.
#   blender -b plate_scene_v7.blend --python bake_env_m8.py -- <outDir> [only=A,B] [spp=32] [tscale=1.0] [vis=2] [noglb]
import bpy, bmesh, json, math, os, sys, time
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from env_repair import repair

ARGV = sys.argv[sys.argv.index("--") + 1:]
OUT = ARGV[0]
FLAGS = dict(a.split("=", 1) for a in ARGV[1:] if "=" in a)
ONLY = [n for n in FLAGS.get("only", "").split(",") if n]
SPP = int(FLAGS.get("spp", 32))
TSCALE = float(FLAGS.get("tscale", 1.0))
VIS = int(FLAGS.get("vis", 2))          # ray-cast every VIS-th texel in x and y (mask upsampled)
NOGLB = "noglb" in ARGV[1:]
DEBUG = "debug" in ARGV[1:]
# Stages (one Blender session each keeps memory flat; a single session crept past the watchdog's 700 MB floor):
#   all    : everything in one session (small subsets / tests)
#   prep   : position maps + every mesh prepared, saved to <out>/bake_scene.blend (a new file, never the source)
#   bake   : open bake_scene.blend, load the position maps, bake the objects in only=..., write env_baked_<batch>.json
#   export : open bake_scene.blend, merge the batch manifests, export env_baked.glb
STAGE = FLAGS.get("stage", "all")
BATCH = FLAGS.get("batch", "0")
PLATES = os.path.join(os.path.dirname(HERE), "blend", "v2build7")
CAMS = ["rest", "tilt", "hold", "orbN", "orbP"]       # priority order
EXPO = -2.158
os.makedirs(os.path.join(OUT, "tex"), exist_ok=True)
LOGF = open(os.path.join(OUT, "bake_log.txt"), "a", encoding="utf-8")


def log(*a):
    s = time.strftime("%H:%M:%S ") + " ".join(str(x) for x in a)
    print(s)
    LOGF.write(s + "\n")
    LOGF.flush()


T0 = time.time()
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = SPP
sc.cycles.use_denoising = False
# The plates' render look (render_plates_v3.py, audit A1 #8): texture limit 1024, simplify 3, the same bounces and clamp, so
# light-baked texels next to projected ones do not differ in texture detail or energy.
cy = sc.cycles
for k, v in dict(texture_limit_render='1024', max_bounces=6, diffuse_bounces=2, glossy_bounces=3, transmission_bounces=4,
                 transparent_max_bounces=6, volume_bounces=0, caustics_reflective=False, caustics_refractive=False,
                 sample_clamp_indirect=10.0).items():
    try:
        setattr(cy, k, v)
    except Exception as ex:
        print("cycles setting", k, ex)
sc.render.use_simplify = True
sc.render.simplify_subdivision_render = 3
for o in bpy.data.objects:
    for m in o.modifiers:
        if m.type == 'WAVE':
            m.show_render = False                       # calm water, as the plates
dg = bpy.context.evaluated_depsgraph_get()

# ---- selection (as export_env_v4.py)
RINGS = ["Circle.025", "Circle.026", "Circle.027", "Circle.028", "Circle.029", "Circle.030", "Circle.031", "Circle.032"]
HERO = RINGS + ["Icosphere.011", "Cube.009", "Cube.010"]
CLOUDS = [o.name for o in bpy.data.objects if o.name.startswith("pngimg.com")]
WATER = ["Plane.011", "Plane.013"]
SKIP = set(HERO + CLOUDS + WATER) | {o.name for o in bpy.data.objects if o.name.startswith("V2_") and o.name not in ("V2_Ridge", "V2_Massif")}
ENV = [o for o in bpy.data.objects if o.type == 'MESH' and o.name not in SKIP and not o.hide_render]
for n in HERO:
    if n in bpy.data.objects:
        bpy.data.objects[n].hide_render = True          # the plates were rendered without the hero


def budget(name):
    # Triangles for real rendering (silhouettes must hold; far ranges were 16k as proxies).
    if name in ("V2_Massif", "V2_Ridge"):
        return 10 ** 9
    if name.startswith("Object_2"):
        return 24000
    if name == "BG.001":
        return 10 ** 9
    if name.startswith("gfsw"):
        return 12000
    if name == "Plane.015":
        return 12000
    if name.startswith("Plane.0"):
        return 8000
    if name.startswith("Retopo_Plane"):
        return 8000
    return 5000


# ---- the plate cameras (as rendered: plate json camera block) and images
def make_cam(meta):
    c = meta["camera"]
    cd = bpy.data.cameras.new("bakecam_" + meta["name"])
    cd.lens = c["lens_mm"]
    cd.sensor_width = c["sensor_mm"]
    cd.sensor_fit = c["sensor_fit"]
    cd.shift_x = 0.0
    cd.shift_y = meta["overscan"]["shift_y"]
    co = bpy.data.objects.new("bakecam_" + meta["name"], cd)
    co.location = Vector(c["location_blender"])
    co.rotation_euler = [math.radians(v) for v in c["rotation_euler_deg"]]
    sc.collection.objects.link(co)
    bpy.context.view_layer.update()
    W, H = meta["width"], meta["height"]
    P = np.array(co.calc_matrix_camera(bpy.context.evaluated_depsgraph_get(), x=W, y=H, scale_x=1.0, scale_y=1.0))
    V = np.array(co.matrix_world.inverted())
    return {"name": meta["name"], "W": W, "H": H, "PV": P @ V, "pos": np.array(co.matrix_world.translation), "obj": co}


cams = []
for k in CAMS:
    jp = os.path.join(PLATES, "plate_%s.json" % k)
    ep = os.path.join(PLATES, "plate_%s.exr" % k)
    if not (os.path.exists(jp) and os.path.exists(ep)):
        log("plate missing", k)
        continue
    meta = json.load(open(jp, encoding="utf-8"))
    cam = make_cam(meta)
    img = bpy.data.images.load(ep)
    W, H = img.size
    buf = np.empty(W * H * 4, dtype=np.float32)
    img.pixels.foreach_get(buf)
    # float16 halves the five plates' footprint (~90 MB); sampling converts back to float32.
    cam["img"] = buf.reshape(H, W, 4)[:, :, :3].astype(np.float16)
    del buf
    bpy.data.images.remove(img)
    log("plate", k, W, H, "cs", "p50 %.3f" % float(np.median(cam["img"])))
    cams.append(cam)


def sample_plate(cam, uv):
    # Bilinear sample of a plate at normalized uv (N,2), v up (Blender image rows start at the bottom).
    H, W = cam["img"].shape[:2]
    x = np.clip(uv[:, 0] * W - 0.5, 0, W - 1.001)
    y = np.clip(uv[:, 1] * H - 0.5, 0, H - 1.001)
    x0 = np.floor(x).astype(np.int64)
    y0 = np.floor(y).astype(np.int64)
    fx = (x - x0)[:, None]
    fy = (y - y0)[:, None]
    im = cam["img"]
    c00 = im[y0, x0].astype(np.float32)
    c10 = im[y0, x0 + 1].astype(np.float32)
    c01 = im[y0 + 1, x0].astype(np.float32)
    c11 = im[y0 + 1, x0 + 1].astype(np.float32)
    return (c00 * (1 - fx) + c10 * fx) * (1 - fy) + (c01 * (1 - fx) + c11 * fx) * fy


def project(cam, P):
    # World points (N,3) -> uv (N,2) in [0,1] and an inside flag.
    hp = np.concatenate([P, np.ones((P.shape[0], 1))], axis=1) @ cam["PV"].T
    w = hp[:, 3:4]
    ndc = hp[:, :2] / np.where(np.abs(w) < 1e-9, 1e-9, w)
    uv = ndc * 0.5 + 0.5
    inside = (w[:, 0] > 0) & (uv[:, 0] > 0.002) & (uv[:, 0] < 0.998) & (uv[:, 1] > 0.002) & (uv[:, 1] < 0.998)
    return uv, inside


# ---- what each plate camera really saw: a POSITION map per camera, rendered from the as-rendered scene (BEFORE any
# edits) with a material override that emits the world position (scene bbox mapped to 0..1), 1 spp, a near-box pixel filter,
# transparent film (alpha 0 = sky). Volumes (V2_ mist) and clouds are hidden (the plates' clouds are camera-invisible).
SMIN = np.array([-500.0, -500.0, -100.0])
SSIZE = np.array([1000.0, 1000.0, 400.0])


def position_maps():
    m = bpy.data.materials.new("aux_posmap")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
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
    nt.links.new(em.outputs[0], out.inputs['Surface'])
    hidden = []
    for o in bpy.data.objects:
        if (o.name.startswith("V2_") and o.name not in ("V2_Ridge", "V2_Massif")) or o.name in CLOUDS:
            if not o.hide_render:
                o.hide_render = True
                hidden.append(o)
    vl = bpy.context.view_layer
    keep = dict(samples=sc.cycles.samples, filt=sc.cycles.filter_width, film=sc.render.film_transparent,
                rx=sc.render.resolution_x, ry=sc.render.resolution_y, rp=sc.render.resolution_percentage,
                cam=sc.camera, fmt=sc.render.image_settings.file_format, path=sc.render.filepath, ovr=vl.material_override)
    sc.cycles.samples = 1
    sc.cycles.filter_width = 0.01
    sc.render.film_transparent = True
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'OPEN_EXR'
    try:
        sc.render.image_settings.color_depth = '32'
    except Exception:
        pass
    vl.material_override = m
    import gc
    for cam in cams:
        t = time.time()
        sc.camera = cam["obj"]
        # Half the plate resolution (the 8 GB laptop: full-size renders + plates pushed it under 700 MB available).
        sc.render.resolution_x, sc.render.resolution_y = cam["W"] // 2, cam["H"] // 2
        fp = os.path.join(OUT, "posmap_%s.exr" % cam["name"])
        sc.render.filepath = fp
        if STAGE in ("all", "prep") or not os.path.exists(fp):
            bpy.ops.render.render(write_still=True)
        img = bpy.data.images.load(fp)
        a = pix(img)
        bpy.data.images.remove(img)
        cam["posmap"] = (a[:, :, :3] * SSIZE.astype(np.float32) + SMIN.astype(np.float32)).astype(np.float32)
        al = a[:, :, 3].copy()
        # Depth edges (the plates' anti-aliased rims blend occluder and background): > 3 % depth jump to a neighbour, grown
        # by 1 posmap px (= 2 plate px). Texels landing there take the light bake.
        dep = np.linalg.norm(cam["posmap"] - np.array(cam["pos"], dtype=np.float32)[None, None, :], axis=2)
        edge = np.zeros(dep.shape, dtype=bool)
        for dy, dx in ((1, 0), (0, 1), (1, 1), (1, -1)):
            nb = np.roll(np.roll(dep, dy, axis=0), dx, axis=1)
            edge |= np.abs(dep - nb) > 0.03 * np.minimum(dep, nb)
        grow = edge.copy()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            grow |= np.roll(np.roll(edge, dy, axis=0), dx, axis=1)
        al[grow] = 0.0
        cam["posalpha"] = al
        log("POSMAP %s %dx%d  surface %.1f%%  (%.0f s)" % (cam["name"], a.shape[1], a.shape[0], 100 * float((a[:, :, 3] > 0.5).mean()), time.time() - t))
        del a
        gc.collect()
    vl.material_override = keep["ovr"]
    sc.cycles.samples, sc.cycles.filter_width, sc.render.film_transparent = keep["samples"], keep["filt"], keep["film"]
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = keep["rx"], keep["ry"], keep["rp"]
    sc.camera, sc.render.image_settings.file_format, sc.render.filepath = keep["cam"], keep["fmt"], keep["path"]
    for o in hidden:
        o.hide_render = False
    bpy.data.materials.remove(m)


def visible(cam, P, N, uv):
    # A texel is seen by a plate camera when the position map at its pixel IS that texel (within a depth-relative
    # tolerance); grazing views fade (|cos| 0.08 -> 0.33).
    H, W = cam["posmap"].shape[:2]
    x = np.clip((uv[:, 0] * W).astype(np.int64), 0, W - 1)
    y = np.clip((uv[:, 1] * H).astype(np.int64), 0, H - 1)
    seen = cam["posmap"][y, x]
    a = cam["posalpha"][y, x]
    d = P - cam["pos"][None, :]
    L = np.linalg.norm(d, axis=1)
    err = np.linalg.norm(seen - P, axis=1)
    ok = (a > 0.5) & (err < 0.006 * L + 0.05)
    cosv = np.abs(np.sum(d / np.maximum(L, 1e-6)[:, None] * N, axis=1))
    if DEBUG:
        q = np.percentile(err, [10, 50, 90]) if len(err) else [0, 0, 0]
        log("   vis %s n %d alpha %.2f err p10/50/90 %.2f %.2f %.2f  L p50 %.1f  ok %.3f  cos p50 %.2f  sample P %s seen %s" % (
            cam["name"], len(err), float((a > 0.5).mean()) if len(a) else 0, q[0], q[1], q[2], float(np.median(L)) if len(L) else 0,
            float(ok.mean()) if len(ok) else 0, float(np.median(cosv)) if len(cosv) else 0,
            np.round(P[len(P) // 2], 2).tolist() if len(P) else None, np.round(seen[len(P) // 2], 2).tolist() if len(P) else None))
    return ok * np.clip((cosv - 0.15) / 0.2, 0.0, 1.0)


# ---- texture size from the screen coverage (rest camera, bbox corners) and nearness (the hold dolly magnifies near ones)
def tex_size(o):
    rest = cams[0]
    cs = np.array([list(o.matrix_world @ Vector(c)) for c in o.bound_box])
    uv, inside = project(rest, cs)
    uvc = np.clip(uv, 0, 1)
    area = max((uvc[:, 0].max() - uvc[:, 0].min()) * (uvc[:, 1].max() - uvc[:, 1].min()), 1e-4)
    d = np.linalg.norm(cs.mean(axis=0) - rest["pos"])
    # The visible faces' plate-pixel area (prep), over ~0.45 of the texture they end up with (visible share x packing).
    need = float(o.get("bake_need", 0.0))
    texels = need / 0.45
    s = 2 ** int(math.ceil(math.log2(max(math.sqrt(max(texels, 1.0)) * TSCALE, 64))))
    if "size" in FLAGS:
        s = int(FLAGS["size"])
    if o.name == "BG.001":
        s = 64      # a constant emitter: light bake only (the plates' sky carries the summit wisp, audit A1 #2 / #4)
    return int(min(max(s, 256), 2048)), float(area), float(d)


# ---- per-object preparation
def prep(o):
    t = time.time()
    eo = o.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(eo, preserve_all_data_layers=False, depsgraph=dg)
    o.modifiers.clear()
    old = o.data
    o.data = me
    if old.users == 0:
        bpy.data.meshes.remove(old)
    repair(o, 0.03, log=log)
    # Underwater faces are never seen (the lake is opaque; audit A1 1.4): every vertex below z -0.05 -> deleted.
    bmu = bmesh.new()
    bmu.from_mesh(me)
    Mw = o.matrix_world
    under = [f for f in bmu.faces if all((Mw @ v.co).z < -0.05 for v in f.verts)]
    if under:
        bmesh.ops.delete(bmu, geom=under, context='FACES')
        bmu.to_mesh(me)
        me.update()
    bmu.free()
    n = len(me.polygons)
    b = budget(o.name)
    if n > b * 1.05:
        bpy.context.view_layer.objects.active = o
        m = o.modifiers.new("BAKE_DEC", 'DECIMATE')
        m.decimate_type = 'COLLAPSE'
        m.ratio = b / n
        m.use_collapse_triangulate = True
        for x in bpy.data.objects:
            x.select_set(False)
        o.select_set(True)
        bpy.ops.object.modifier_apply(modifier="BAKE_DEC")
    for u in list(me.uv_layers):
        me.uv_layers.remove(u)
    uvl = me.uv_layers.new(name="bake")
    me.uv_layers.active = uvl
    # Texel budget follows what the cameras see: faces a plate camera sees (the V2_Massif test: 4 % of its surface) get their
    # own islands (seams along the visible / hidden border) and the hidden islands shrink to HID_SCALE before packing.
    M = np.array(o.matrix_world, dtype=np.float64)
    npoly = len(me.polygons)
    ctr = np.empty(npoly * 3, dtype=np.float32)
    me.polygons.foreach_get("center", ctr)
    nrm = np.empty(npoly * 3, dtype=np.float32)
    me.polygons.foreach_get("normal", nrm)
    ctr = (ctr.reshape(-1, 3).astype(np.float64) @ M[:3, :3].T + M[:3, 3]).astype(np.float32)
    nrm = nrm.reshape(-1, 3).astype(np.float64) @ np.linalg.inv(M[:3, :3]).T
    nrm = (nrm / np.maximum(np.linalg.norm(nrm, axis=1), 1e-12)[:, None]).astype(np.float32)
    fvis = np.zeros(npoly, dtype=np.float32)
    for cam in cams:
        uvc, ins = project(cam, ctr)
        idx = np.nonzero(ins)[0]
        if len(idx):
            fvis[idx] = np.maximum(fvis[idx], visible(cam, ctr[idx], nrm[idx], uvc[idx]))
    vis_faces = fvis > 0.25
    # Texel need from what the cameras see: the visible triangles' area in rest-plate pixels (x the hold / tilt zoom for
    # near objects), at ~2.6 texels per plate pixel... the plate is 1.625 px per screen px, so ~1:1 with the plate.
    me.calc_loop_triangles()
    ntri = len(me.loop_triangles)
    tv = np.empty(ntri * 3, dtype=np.int32)
    me.loop_triangles.foreach_get("vertices", tv)
    tpoly = np.empty(ntri, dtype=np.int32)
    me.loop_triangles.foreach_get("polygon_index", tpoly)
    vco = np.empty(len(me.vertices) * 3, dtype=np.float32)
    me.vertices.foreach_get("co", vco)
    vw = vco.reshape(-1, 3).astype(np.float64) @ M[:3, :3].T + M[:3, 3]
    uvv, _ = project(cams[0], vw)
    pxv = uvv * np.array([cams[0]["W"], cams[0]["H"]])
    tv = tv.reshape(-1, 3)
    a2 = np.abs(np.cross(pxv[tv[:, 1]] - pxv[tv[:, 0]], pxv[tv[:, 2]] - pxv[tv[:, 0]])) * 0.5
    seen_px = float(np.sum(a2 * vis_faces[tpoly]))
    dist = float(np.linalg.norm(ctr.mean(axis=0) - cams[0]["pos"]))
    zoom = 2.2 if dist < 30 else (1.4 if dist < 70 else 1.1)
    o["bake_need"] = seen_px * zoom * zoom
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.faces.ensure_lookup_table()
    for e in bm.edges:
        e.seam = False
        lf = e.link_faces
        if len(lf) == 2 and vis_faces[lf[0].index] != vis_faces[lf[1].index]:
            e.seam = True
    bm.to_mesh(me)
    bm.free()
    for x in bpy.data.objects:
        x.select_set(False)
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    sc.tool_settings.use_uv_select_sync = True
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.unwrap(method='ANGLE_BASED', margin=0.004)
    bpy.ops.object.mode_set(mode='OBJECT')
    # Shrink the hidden faces' UVs about their own island centroid (islands never mix visible and hidden faces).
    HID = float(FLAGS.get("hid", 0.25))
    if vis_faces.any() and (~vis_faces).any() and HID < 1.0:
        luv = np.empty(len(me.loops) * 2, dtype=np.float32)
        me.uv_layers["bake"].data.foreach_get("uv", luv)
        luv = luv.reshape(-1, 2)
        lpoly = np.empty(len(me.loops), dtype=np.int32)
        # loop -> polygon index
        ls = np.empty(npoly, dtype=np.int32)
        me.polygons.foreach_get("loop_start", ls)
        lt = np.empty(npoly, dtype=np.int32)
        me.polygons.foreach_get("loop_total", lt)
        lpoly = np.repeat(np.arange(npoly, dtype=np.int32), lt)
        hid_l = ~vis_faces[lpoly]
        c = luv[hid_l].mean(axis=0)
        luv[hid_l] = c + (luv[hid_l] - c) * HID
        me.uv_layers["bake"].data.foreach_set("uv", luv.ravel())
    sc.tool_settings.use_uv_select_sync = True      # UV ops then act on the (fully selected) mesh selection
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    try:
        r = bpy.ops.uv.pack_islands(rotate=True, scale=True, margin=0.008)
    except Exception as ex:
        log("  pack_islands(rotate, scale) failed:", ex)
        r = bpy.ops.uv.pack_islands(margin=0.008)
    bpy.ops.object.mode_set(mode='OBJECT')
    luv = np.empty(len(me.loops) * 2, dtype=np.float32)
    me.uv_layers["bake"].data.foreach_get("uv", luv)
    luv = luv.reshape(-1, 2)
    log("  pack %s  uv bbox %s" % (r, np.round([luv[:, 0].min(), luv[:, 1].min(), luv[:, 0].max(), luv[:, 1].max()], 3).tolist()))
    log("PREP %-22s polys %6d -> %6d  visible faces %.1f%%  (%.1f s)" % (o.name, n, len(me.polygons), 100 * float(vis_faces.mean()), time.time() - t))


def target_image(o, name, size, float_buf=True):
    img = bpy.data.images.new(name, size, size, alpha=True, float_buffer=float_buf)
    img.colorspace_settings.name = 'Non-Color'
    return img


def with_active_image(o, img, mat_override=None):
    # Every material slot gets an Image node holding img, active (Cycles bakes into the active image node).
    added = []
    mats = [s.material for s in o.material_slots if s.material] if mat_override is None else [mat_override]
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


def pix(img):
    w, h = img.size
    a = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(a)
    return a.reshape(h, w, 4)


def bake(o, kind, img, **kw):
    for x in bpy.data.objects:
        x.select_set(False)
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.bake(type=kind, uv_layer="bake", target='IMAGE_TEXTURES', **kw)


def aux_material(name, kind, bmin, bsize):
    # Emission of the world position (mapped to the object's world bbox) or the world normal (0.5 + 0.5 n).
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    vm = nt.nodes.new('ShaderNodeVectorMath')
    if kind == "pos":
        vm.operation = 'SUBTRACT'
        vm.inputs[1].default_value = bmin
        vm2 = nt.nodes.new('ShaderNodeVectorMath')
        vm2.operation = 'DIVIDE'
        vm2.inputs[1].default_value = bsize
        nt.links.new(geo.outputs['Position'], vm.inputs[0])
        nt.links.new(vm.outputs[0], vm2.inputs[0])
        nt.links.new(vm2.outputs[0], em.inputs['Color'])
    else:
        vm.operation = 'MULTIPLY_ADD'
        vm.inputs[1].default_value = (0.5, 0.5, 0.5)
        vm.inputs[2].default_value = (0.5, 0.5, 0.5)
        nt.links.new(geo.outputs['True Normal'], vm.inputs[0])
        nt.links.new(vm.outputs[0], em.inputs['Color'])
    em.inputs['Strength'].default_value = 1.0
    nt.links.new(em.outputs[0], out.inputs['Surface'])
    return m


def raster_uv(o, size):
    # World position, flat world normal and coverage per texel of the "bake" UV map, rasterised in numpy (a Cycles EMIT bake at
    # 2048 pushed the laptop under the watchdog's 700 MB). Rows start at the bottom (Blender's image convention).
    me = o.data
    me.calc_loop_triangles()
    nv, nl, ntri = len(me.vertices), len(me.loops), len(me.loop_triangles)
    co = np.empty(nv * 3, dtype=np.float32)
    me.vertices.foreach_get("co", co)
    M = np.array(o.matrix_world, dtype=np.float64)
    Wv = (co.reshape(-1, 3).astype(np.float64) @ M[:3, :3].T + M[:3, 3]).astype(np.float32)
    tv = np.empty(ntri * 3, dtype=np.int32)
    me.loop_triangles.foreach_get("vertices", tv)
    tv = tv.reshape(-1, 3)
    tl = np.empty(ntri * 3, dtype=np.int32)
    me.loop_triangles.foreach_get("loops", tl)
    tl = tl.reshape(-1, 3)
    uv = np.empty(nl * 2, dtype=np.float32)
    me.uv_layers["bake"].data.foreach_get("uv", uv)
    uv = uv.reshape(-1, 2)
    A, B, C = Wv[tv[:, 0]], Wv[tv[:, 1]], Wv[tv[:, 2]]
    Nf = np.cross(B - A, C - A)
    Nf /= np.maximum(np.linalg.norm(Nf, axis=1), 1e-12)[:, None]
    U = uv[tl] * size - 0.5
    P = np.zeros((size, size, 3), dtype=np.float32)
    Nm = np.zeros((size, size, 3), dtype=np.float32)
    cov = np.zeros((size, size), dtype=bool)
    lo = np.floor(U.min(axis=1)).astype(np.int64)
    hi = np.ceil(U.max(axis=1)).astype(np.int64)
    lo = np.clip(lo, 0, size - 1)
    hi = np.clip(hi, 0, size - 1)
    for t in range(ntri):
        x0, y0 = lo[t]
        x1, y1 = hi[t]
        if x1 < x0 or y1 < y0:
            continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1, dtype=np.float32), np.arange(y0, y1 + 1, dtype=np.float32))
        (ax, ay), (bx, by), (cx, cy) = U[t]
        den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
        if abs(den) < 1e-12:
            continue
        l0 = ((by - cy) * (gx - cx) + (cx - bx) * (gy - cy)) / den
        l1 = ((cy - ay) * (gx - cx) + (ax - cx) * (gy - cy)) / den
        l2 = 1.0 - l0 - l1
        ins = (l0 >= -0.01) & (l1 >= -0.01) & (l2 >= -0.01)
        if not ins.any():
            continue
        yy = gy[ins].astype(np.int64)
        xx = gx[ins].astype(np.int64)
        P[yy, xx] = l0[ins][:, None] * A[t] + l1[ins][:, None] * B[t] + l2[ins][:, None] * C[t]
        Nm[yy, xx] = Nf[t]
        cov[yy, xx] = True
    return P, Nm, cov


def upsample(a, size):
    # Bilinear resize of an (h, w, c) array to (size, size, c).
    h, w = a.shape[:2]
    if h == size and w == size:
        return a
    ys = (np.arange(size) + 0.5) * h / size - 0.5
    xs = (np.arange(size) + 0.5) * w / size - 0.5
    y0 = np.clip(np.floor(ys).astype(np.int64), 0, h - 1)
    x0 = np.clip(np.floor(xs).astype(np.int64), 0, w - 1)
    y1 = np.clip(y0 + 1, 0, h - 1)
    x1 = np.clip(x0 + 1, 0, w - 1)
    fy = np.clip(ys - y0, 0, 1)[:, None, None]
    fx = np.clip(xs - x0, 0, 1)[None, :, None]
    top = a[y0][:, x0] * (1 - fx) + a[y0][:, x1] * fx
    bot = a[y1][:, x0] * (1 - fx) + a[y1][:, x1] * fx
    return (top * (1 - fy) + bot * fy).astype(np.float32)


def blur_mask(m, r):
    # Separable box blur (r texels), edge-clamped.
    if r < 1:
        return m
    k = 2 * r + 1
    c = np.cumsum(np.pad(m, ((r + 1, r), (0, 0)), mode='edge'), axis=0)
    m = (c[k:, :] - c[:-k, :]) / k
    c = np.cumsum(np.pad(m, ((0, 0), (r + 1, r)), mode='edge'), axis=1)
    return (c[:, k:] - c[:, :-k]) / k


def dilate(col, cov, iters):
    # Push colours into uncovered texels (mip safety at island borders).
    col = col.copy()
    cov = cov.copy()
    for _ in range(iters):
        if cov.all():
            break
        acc = np.zeros_like(col)
        cnt = np.zeros(cov.shape, dtype=np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sh = np.roll(np.roll(cov, dy, axis=0), dx, axis=1)
            shc = np.roll(np.roll(col, dy, axis=0), dx, axis=1)
            acc += shc * sh[..., None]
            cnt += sh
        fill = (~cov) & (cnt > 0)
        col[fill] = acc[fill] / cnt[fill][:, None]
        cov = cov | fill
    return col, cov


sc.render.use_persistent_data = False
if STAGE in ("all", "prep", "bake"):
    position_maps()
manifest = {"exposureStops": EXPO, "objects": {}}
todo = [o for o in ENV if not ONLY or o.name in ONLY]
log("STAGE", STAGE, "batch", BATCH, "objects", len(todo), [o.name for o in todo])
LSIZE = int(FLAGS.get("lsize", 1024))
import gc
SCENE_COPY = os.path.join(OUT, "bake_scene.blend")
if STAGE in ("all", "prep"):
    # Every mesh prepared first (modifiers applied, repaired, decimated, unwrapped): a lighter scene for every light bake.
    for o in todo:
        prep(o)
        gc.collect()
if STAGE == "prep":
    # A NEW file in the output folder (the source plate_scene_v7.blend is never written).
    bpy.ops.wm.save_as_mainfile(filepath=SCENE_COPY, copy=True)
    log("PREP_SAVED", SCENE_COPY)
    sys.exit(0)
if STAGE == "export":
    parts = sorted(f for f in os.listdir(OUT) if f.startswith("env_baked_") and f.endswith(".json"))
    for f in parts:
        manifest["objects"].update(json.load(open(os.path.join(OUT, f), encoding="utf-8"))["objects"])
    todo = [o for o in ENV if o.name in manifest["objects"]]
    log("EXPORT merging", len(parts), "parts,", len(todo), "objects")
    todo_bake = []
else:
    todo_bake = todo
for o in todo_bake:
    pass
# The lake does not light the snow much and its subdivided, waved planes cost the bakes a lot of memory.
for n in WATER:
    if n in bpy.data.objects:
        bpy.data.objects[n].hide_render = True
for o in todo_bake:
    t0 = time.time()
    size, area, dist = tex_size(o)
    # 1. Cycles light bake (the fill), scene-linear, at most LSIZE, upsampled.
    ls = min(size, LSIZE)
    img = target_image(o, "lit_" + o.name, ls)
    added = with_active_image(o, img)
    sc.cycles.samples = SPP
    bake(o, 'COMBINED', img, margin=4, use_clear=True)
    lit = pix(img)[:, :, :3].copy()
    # A 3x3 box against the bake noise (it only fills what no plate saw).
    lp = np.pad(lit, ((1, 1), (1, 1), (0, 0)), mode='edge')
    lit = sum(lp[1 + dy:1 + dy + ls, 1 + dx:1 + dx + ls] for dy in (-1, 0, 1) for dx in (-1, 0, 1)) / 9.0
    lit = upsample(lit.astype(np.float32), size)
    drop_nodes(added)
    bpy.data.images.remove(img)
    gc.collect()
    # 2. Texel world positions + normals (numpy rasteriser of the bake UVs).
    tr = time.time()
    P, N, cov = raster_uv(o, size)
    log("  raster %s %d px  %.1f s  cover %.1f%%" % (o.name, size, time.time() - tr, 100 * float(cov.mean())))
    # 3. Plates where a plate camera sees the texel (every covered texel, vectorized against the position maps).
    ys, xs = np.nonzero(cov)
    Ps, Ns = P[ys, xs], N[ys, xs]
    best_w = np.zeros(len(ys), dtype=np.float32)
    best_c = np.zeros((len(ys), 3), dtype=np.float32)
    seen = {}
    for cam in (cams if o.name != "BG.001" else []):
        uv, inside = project(cam, Ps)
        if DEBUG:
            log("   proj %s inside %.3f  uv p50 %s" % (cam["name"], float(inside.mean()), np.round(np.median(uv, axis=0), 3).tolist()))
        idx = np.nonzero(inside & (best_w < 0.999))[0]
        if len(idx) == 0:
            seen[cam["name"]] = 0.0
            continue
        w = np.zeros(len(ys), dtype=np.float32)
        w[idx] = visible(cam, Ps[idx], Ns[idx], uv[idx])
        # Rest first: a later camera only fills what the earlier ones did not (soft takeover).
        take = w * (1.0 - best_w)
        c = np.zeros((len(ys), 3), dtype=np.float32)
        c[idx] = sample_plate(cam, uv[idx])
        den = best_w + take
        best_c = np.where(den[:, None] > 1e-6, (best_c * best_w[:, None] + c * take[:, None]) / np.maximum(den, 1e-6)[:, None], best_c)
        best_w = np.minimum(den, 1.0)
        seen[cam["name"]] = round(float((w > 0.5).mean()), 3)
    Wm = np.zeros(cov.shape, dtype=np.float32)
    Cm = np.zeros(cov.shape + (3,), dtype=np.float32)
    Wm[ys, xs] = best_w
    Cm[ys, xs] = best_c
    # A soft seam between plate texels and the light bake (2-texel box).
    Wm = np.minimum(blur_mask(Wm, 2), Wm + 0.0) * cov
    # 4. Colour-match the light bake to the plates on texels both see well, then mix.
    both = (Wm > 0.9) & cov
    if both.sum() > 200:
        ratio = np.median(Cm[both] / np.maximum(lit[both], 1e-4), axis=0)
        gain = np.clip(ratio, 0.4, 2.5)
    else:
        gain = np.array([1.0, 1.0, 1.0])
    final = lit * gain[None, None, :] * (1.0 - Wm[..., None]) + Cm * Wm[..., None]
    if DEBUG:
        dbg = np.zeros((size, size, 4), dtype=np.float32)
        dbg[..., 0] = Wm
        dbg[..., 1] = cov * 0.4
        dbg[..., 3] = 1.0
        di = bpy.data.images.new("dbg_" + o.name, size, size, alpha=True, float_buffer=False)
        di.colorspace_settings.name = 'Non-Color'
        di.pixels.foreach_set(dbg.ravel())
        di.filepath_raw = os.path.join(OUT, "tex", "mask_" + o.name.replace(".", "_") + ".png")
        di.file_format = 'PNG'
        di.save()
        bpy.data.images.remove(di)
    final, cov2 = dilate(final, cov, 12)
    # 5. 8-bit in the plates' encoding.
    lin = np.clip(final * (2.0 ** EXPO), 0.0, 1.0)
    srgb = np.where(lin <= 0.0031308, lin * 12.92, 1.055 * np.power(lin, 1.0 / 2.4) - 0.055)
    out = np.concatenate([srgb, np.ones(srgb.shape[:2] + (1,), dtype=np.float32)], axis=2).astype(np.float32)
    img = bpy.data.images.new("tex_" + o.name, size, size, alpha=True, float_buffer=False)
    img.colorspace_settings.name = 'Non-Color'
    img.pixels.foreach_set(out.ravel())
    fn = o.name.replace(" ", "_").replace(".", "_") + ".png"
    img.filepath_raw = os.path.join(OUT, "tex", fn)
    img.file_format = 'PNG'
    img.save()
    bpy.data.images.remove(img)
    node = "".join(ch for ch in o.name.replace(" ", "_") if ch not in ".:/[]")      # three's GLTFLoader node name
    manifest["objects"][o.name] = {"node": node, "texture": "tex/" + fn, "size": size, "gain": [round(float(g), 4) for g in gain],
                                   "plateShare": round(float((Wm > 0.5).sum() / max(cov.sum(), 1)), 4), "seen": seen,
                                   "polys": len(o.data.polygons), "screenArea": round(area, 5), "dist": round(dist, 1)}
    log("BAKED %-22s %4d px  plate %.0f%%  gain %s  seen %s  (%.0f s)" % (o.name, size, 100 * manifest["objects"][o.name]["plateShare"],
        np.round(gain, 3).tolist(), {k: round(v, 2) for k, v in seen.items()}, time.time() - t0))
    del lit, P, N, Wm, Cm, final, out
    gc.collect()

with open(os.path.join(OUT, "env_baked.json" if STAGE in ("all", "export") else "env_baked_%s.json" % BATCH), "w", encoding="utf-8") as f:
    json.dump(manifest, f, indent=1)

if not NOGLB and STAGE in ("all", "export"):
    for x in bpy.data.objects:
        x.select_set(False)
    for o in todo:
        o.select_set(True)
        for s in o.material_slots:
            s.material = None
    bpy.context.view_layer.objects.active = todo[0]
    kw = dict(filepath=os.path.join(OUT, "env_baked.glb"), export_format='GLB', use_selection=True, export_apply=True,
              export_yup=True, export_texcoords=True, export_normals=True, export_tangents=False, export_materials='NONE',
              export_cameras=False, export_lights=False, export_animations=False, export_extras=False,
              export_vertex_color='NONE', export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
              export_draco_position_quantization=14, export_draco_normal_quantization=10, export_draco_texcoord_quantization=14)
    op = bpy.ops.export_scene.gltf
    props = set(op.get_rna_type().properties.keys())
    res = op(**{k: v for k, v in kw.items() if k in props})
    log("EXPORT", res, round(os.path.getsize(kw["filepath"]) / 1024, 1), "KB")
log("DONE %.0f s" % (time.time() - T0))
