# World-only sky panorama for the baked environment's lake reflection (audit A1 R8 / #12) and the summit wisp card
# (A1 #2), macOS / Metal port (round 11, ENV lane). Never saves the .blend.
#   blender -b plate_scene_v7_copy.blend --python render_sky_equirect.py -- <outDir> [w=2048] [spp=32] [plates=<dir>]
#        [device=METAL|CPU] [what=sky,wisp]
# 1. sky_world.exr: the lake mirrors the Nishita WORLD (dark and saturated near the horizon), never BG.001 (glossy-
#    invisible) nor the cloud cards (the engine draws those live). Every object hidden, an equirect camera at the lake
#    (ripple centre, 0.3 m up) in pano_orb.exr's orientation (three.js equirect convention), scene-linear half EXR.
# 2. wisp_rest.exr + wisp_card.exr/.png + wisp_card.json: V2_SummitWisp alone from the rest plate camera, the rest of the
#    scene present but camera-invisible (it still shadows and lights the volume as in the plates), transparent film, then
#    cropped to the wisp's alpha box. The json gives the card's world quad (Blender and three.js) that projects onto exactly
#    those rest-plate pixels at the wisp's depth, so an engine card drawn there matches the plate at rest.
import bpy, json, math, os, sys
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
OUT = os.path.abspath(argv[0])
FLAGS = dict(a.split("=", 1) for a in argv[1:] if "=" in a)
W = int(FLAGS.get("w", 2048))
SPP = int(FLAGS.get("spp", 32))
WHAT = FLAGS.get("what", "sky,wisp").split(",")
HERE = os.path.dirname(os.path.abspath(__file__))
PLATES = FLAGS.get("plates", os.path.join(os.path.dirname(HERE), "blender", "plates_v7"))
os.makedirs(OUT, exist_ok=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
if FLAGS.get("device", "METAL") == "METAL":
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    for d in prefs.devices:
        d.use = d.type == 'METAL'
    sc.cycles.device = 'GPU'
else:
    sc.cycles.device = 'CPU'
sc.cycles.samples = SPP
sc.cycles.use_adaptive_sampling = False
sc.render.image_settings.file_format = 'OPEN_EXR'
sc.render.image_settings.color_depth = '16'
sc.render.image_settings.exr_codec = 'ZIP'
sc.render.use_simplify = True
sc.render.simplify_subdivision_render = 3
sc.cycles.texture_limit_render = '1024'
sc.frame_set(1)
for o in bpy.data.objects:
    for m in o.modifiers:
        if m.type == 'WAVE':
            m.show_render = False
HERO = ["Circle.025", "Circle.026", "Circle.027", "Circle.028", "Circle.029", "Circle.030", "Circle.031", "Circle.032",
        "Icosphere.011", "Cube.009", "Cube.010"]


def stats(fp):
    img = bpy.data.images.load(fp)
    w, h = img.size
    a = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(a)
    bpy.data.images.remove(img)
    return a.reshape(h, w, 4)                     # rows from the bottom


if "sky" in WHAT:
    keep = {o.name: o.hide_render for o in bpy.data.objects}
    for o in bpy.data.objects:
        if o.type != 'CAMERA':
            o.hide_render = True
    cd = bpy.data.cameras.new("sky_eq")
    cd.type = 'PANO'
    try:
        cd.panorama_type = 'EQUIRECTANGULAR'
    except Exception:
        cd.cycles.panorama_type = 'EQUIRECTANGULAR'
    co = bpy.data.objects.new("sky_eq", cd)
    co.location = Vector((0.0, 8.6, 0.3))
    co.rotation_euler = (math.radians(90.0), 0.0, math.radians(-90.0))   # as pano_orb.exr (render_plates_v3.py "pano")
    sc.collection.objects.link(co)
    sc.camera = co
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = W, W // 2, 100
    sc.render.film_transparent = False
    sc.render.use_border = False
    sc.cycles.use_denoising = False                # a smooth analytic sky: no denoiser artefacts
    sc.cycles.filter_width = 1.5
    sc.render.image_settings.color_mode = 'RGB'
    sc.render.filepath = os.path.join(OUT, "sky_world.exr")
    bpy.ops.render.render(write_still=True)
    a = stats(sc.render.filepath)
    H = a.shape[0]
    rows = {el: a[int((0.5 + el / 180.0) * (H - 1))][:, :3].mean(0).round(4).tolist() for el in (-30, -5, 0, 5, 10, 30, 60, 89)}
    json.dump({"file": "sky_world.exr", "size": [W, W // 2], "camera_blender": [0.0, 8.6, 0.3],
               "orientation": "pano_orb.exr / three.js equirect (camera X 90, Z -90 deg)", "spp": SPP,
               "row_means_by_elevation_deg": rows, "max": float(a[:, :, :3].max())},
              open(os.path.join(OUT, "sky_world.json"), "w"), indent=1)
    print("SKY_DONE", sc.render.filepath, rows)
    for n, v in keep.items():
        bpy.data.objects[n].hide_render = v

if "wisp" in WHAT and "V2_SummitWisp" in bpy.data.objects:
    wisp = bpy.data.objects["V2_SummitWisp"]
    for n in HERO:
        bpy.data.objects[n].hide_render = True
    for o in bpy.data.objects:
        if o.name.startswith("pngimg.com"):
            o.visible_camera = False               # as the plates
            o.visible_glossy = True
        elif o is not wisp and o.type == 'MESH':
            o.visible_camera = False               # present for light and shadow, not drawn
    wisp.hide_render = False
    meta = json.load(open(os.path.join(PLATES, "plate_rest.json"), encoding="utf-8"))
    c = meta["camera"]
    rd = bpy.data.cameras.new("wisp_cam")
    rd.sensor_fit = 'HORIZONTAL'
    rd.lens = c["lens_mm"]
    rd.sensor_width = c["sensor_mm"]
    rd.shift_y = meta["overscan"]["shift_y"]
    ro = bpy.data.objects.new("wisp_cam", rd)
    ro.location = Vector(c["location_blender"])
    ro.rotation_euler = [math.radians(v) for v in c["rotation_euler_deg"]]
    sc.collection.objects.link(ro)
    sc.camera = ro
    PW, PH = meta["width"], meta["height"]
    # Only the wisp's projected box (+ margin) is rendered, at the full plate resolution.
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    Pm = np.array(ro.calc_matrix_camera(dg, x=PW, y=PH, scale_x=1.0, scale_y=1.0)) @ np.array(ro.matrix_world.inverted())
    corners = np.array([list(wisp.matrix_world @ Vector(b)) for b in wisp.bound_box])
    hp = np.concatenate([corners, np.ones((8, 1))], 1) @ Pm.T
    uv = hp[:, :2] / hp[:, 3:4] * 0.5 + 0.5
    m = 0.02
    bx0, by0 = max(0.0, uv[:, 0].min() - m), max(0.0, uv[:, 1].min() - m)
    bx1, by1 = min(1.0, uv[:, 0].max() + m), min(1.0, uv[:, 1].max() + m)
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = PW, PH, 100
    sc.render.use_border = True
    sc.render.use_crop_to_border = True
    sc.render.border_min_x, sc.render.border_min_y, sc.render.border_max_x, sc.render.border_max_y = bx0, by0, bx1, by1
    sc.render.film_transparent = True
    sc.cycles.samples = int(FLAGS.get("wspp", 256))
    sc.cycles.use_denoising = True
    sc.cycles.denoiser = 'OPENIMAGEDENOISE'
    sc.cycles.max_bounces, sc.cycles.volume_bounces = 6, 0
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.filepath = os.path.join(OUT, "wisp_rest.exr")
    bpy.ops.render.render(write_still=True)
    a = stats(sc.render.filepath)                 # rows from the bottom, the border region only
    h, w = a.shape[:2]
    al = a[:, :, 3]
    ys, xs = np.nonzero(al > 0.004)
    x0b, x1b = int(xs.min()), int(xs.max()) + 1
    y0b, y1b = int(ys.min()), int(ys.max()) + 1
    pad = 6
    x0b, y0b = max(0, x0b - pad), max(0, y0b - pad)
    x1b, y1b = min(w, x1b + pad), min(h, y1b + pad)
    card = a[y0b:y1b, x0b:x1b]
    # plate pixel box of the card (pixel edges), rows from the bottom
    ox, oy = int(round(bx0 * PW)), int(round(by0 * PH))
    px0, px1 = ox + x0b, ox + x1b
    py0, py1 = oy + y0b, oy + y1b
    img = bpy.data.images.new("wisp_card", card.shape[1], card.shape[0], alpha=True, float_buffer=True)
    img.pixels.foreach_set(card.astype(np.float32).ravel())
    img.filepath_raw = os.path.join(OUT, "wisp_card.exr")
    img.file_format = 'OPEN_EXR'
    img.save()
    bpy.data.images.remove(img)
    # The card plane: through the wisp's centre, facing the rest camera (normal = -forward), corners on the rays through
    # the box's plate-pixel corners.
    Mi = np.array(ro.matrix_world)
    cam_pos = Mi[:3, 3]
    fwd = -Mi[:3, 2]
    ctr = np.array(list(wisp.matrix_world.translation))
    PVi = np.linalg.inv(Pm)
    quad = []
    for (qx, qy) in ((px0, py0), (px1, py0), (px0, py1), (px1, py1)):
        ndc = np.array([qx / PW * 2 - 1, qy / PH * 2 - 1, 0.5, 1.0])
        p = PVi @ ndc
        p = p[:3] / p[3]
        dvec = p - cam_pos
        dvec /= np.linalg.norm(dvec)
        t = np.dot(ctr - cam_pos, fwd) / np.dot(dvec, fwd)
        quad.append((cam_pos + dvec * t).tolist())
    three = [[q[0], q[2], -q[1]] for q in quad]
    info = {"file": "wisp_card.exr", "size": [card.shape[1], card.shape[0]], "premultiplied": True,
            "plate_box_px_from_bottom": [px0, py0, px1, py1], "plate": [PW, PH],
            "rest_frame_box_px_from_top": [round((px0 - 270) / 1.25, 1), round((PH - py1 - 191.5) / 1.25, 1),
                                           round((px1 - 270) / 1.25, 1), round((PH - py0 - 191.5) / 1.25, 1)],
            "quad_blender_bl_br_tl_tr": quad, "quad_three_bl_br_tl_tr": three,
            "wisp_centre_blender": ctr.tolist(), "wisp_dims": list(wisp.dimensions),
            "alpha_max": float(al.max()), "rgb_max": float(a[:, :, :3].max()), "spp": sc.cycles.samples,
            "note": "RGB premultiplied scene-linear (in-scatter + glow), alpha = 1 - transmittance; draw over the env after "
                    "the opaque pass like a cloud card; the baked BG.001 / V2_Massif textures of v9 still contain the wisp."}
    json.dump(info, open(os.path.join(OUT, "wisp_card.json"), "w"), indent=1)
    print("WISP_DONE", info["size"], info["rest_frame_box_px_from_top"], "alpha max %.3f" % info["alpha_max"])
