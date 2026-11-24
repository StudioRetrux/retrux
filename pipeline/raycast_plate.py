# Which object does a plate pixel show? Rebuilds a plate camera from its json (blend\v2build5\plate_<cam>.json) and
# ray-casts plate pixels into the (evaluated) scene. Never saves the .blend.
#   blender -b plate_scene_v4.blend --python raycast_plate.py -- <plate.json> "x,y;x,y;..."
import bpy, json, math, sys
from mathutils import Vector, Euler

ARGV = sys.argv[sys.argv.index("--") + 1:]
meta = json.load(open(ARGV[0]))
pts = [tuple(float(v) for v in p.split(",")) for p in ARGV[1].split(";") if p]
scene = bpy.context.scene
c = meta["camera"]
cd = bpy.data.cameras.new("__rc_cam__")
cam = bpy.data.objects.new("__rc_cam__", cd)
scene.collection.objects.link(cam)
cam.location = Vector(c["location_blender"])
cam.rotation_mode = 'XYZ'
cam.rotation_euler = Euler([math.radians(a) for a in c["rotation_euler_deg"]], 'XYZ')
cd.sensor_fit = 'HORIZONTAL'
cd.sensor_width = c["sensor_mm"]
cd.lens = c["lens_mm"]
cd.shift_x = 0.0
cd.shift_y = meta["overscan"]["shift_y"]
scene.render.resolution_x = meta["width"]
scene.render.resolution_y = meta["height"]
scene.render.resolution_percentage = 100
bpy.context.view_layer.update()
# Frame corners in camera space (view_frame: top-right, bottom-right, bottom-left, top-left), includes shift and fit.
tr, br, bl, tl = [Vector(v) for v in cd.view_frame(scene=scene)]
mw = cam.matrix_world
deps = bpy.context.evaluated_depsgraph_get()
W, H = meta["width"], meta["height"]
for (px, py) in pts:
    u, v = (px + 0.5) / W, (py + 0.5) / H          # v from the top
    top = tl.lerp(tr, u)
    bot = bl.lerp(br, u)
    p = top.lerp(bot, v)
    d = (mw.to_3x3() @ p).normalized()
    o = cam.location.copy()
    vols = []
    for _ in range(12):
        hit, loc, nor, idx, obj, _m = scene.ray_cast(deps, o, d)
        # Volume boxes (mist / wisp) are not surfaces: note them and continue past.
        if hit and obj and obj.name.startswith("V2_") and obj.name not in ("V2_Ridge", "V2_Massif"):
            vols.append(obj.name)
            o = loc + d * 0.01
            continue
        break
    if vols:
        print("RC   (through volumes %s)" % ",".join(vols))
    if hit:
        mats = [s.material.name for s in obj.material_slots if s.material] if obj else []
        print("RC px %6.1f %6.1f -> %-24s dist %7.2f loc (%.2f, %.2f, %.2f) n (%.2f, %.2f, %.2f) mats %s" % (
            px, py, obj.name, (loc - cam.location).length, loc.x, loc.y, loc.z, nor.x, nor.y, nor.z, mats[:3]))
    else:
        print("RC px %6.1f %6.1f -> (nothing)" % (px, py))
print("RC_DONE")
