# Read-only: list the scene's objects with their screen bounding boxes in the rest camera (1440x766 frame).
#   blender -b <scene.blend> --python inspect_env.py -- <out.json>
import bpy, json, math, sys
from mathutils import Vector, Euler, Matrix

OUT = sys.argv[sys.argv.index("--") + 1]
REST = {"loc": (0.23183887899931777, -11.787528905312952, 2.903973052988094),
        "yaw": 0.672220988573093, "pitch": -0.048456561917928444, "lens": 42.253045166243865}
W, H = 1440, 766
rot = Euler((math.radians(90.0 + REST["pitch"]), 0.0, math.radians(REST["yaw"])), 'XYZ').to_matrix().to_4x4()
cam_m = Matrix.Translation(Vector(REST["loc"])) @ rot
inv = cam_m.inverted()
f = REST["lens"] / 36.0 * W  # focal length in px (horizontal fit)


def project(p):
    c = inv @ p
    if c.z > -0.01:
        return None
    x = W / 2 + f * c.x / -c.z
    y = H / 2 - f * c.y / -c.z
    return x, y, -c.z


deps = bpy.context.evaluated_depsgraph_get()
rows = []
for o in bpy.data.objects:
    if o.type not in ('MESH', 'CURVE', 'SURFACE', 'META', 'FONT', 'VOLUME', 'EMPTY', 'LIGHT', 'CAMERA'):
        continue
    info = {"name": o.name, "type": o.type, "loc": [round(v, 3) for v in o.matrix_world.translation],
            "hide_render": o.hide_render, "visible_camera": getattr(o, "visible_camera", True),
            "parent": o.parent.name if o.parent else None, "collections": [c.name for c in o.users_collection]}
    if o.type == 'MESH':
        info["polys"] = len(o.data.polygons)
        info["dims"] = [round(v, 2) for v in o.dimensions]
        info["materials"] = [m.name for m in o.data.materials if m]
        mods = [(m.name, m.type) for m in o.modifiers]
        info["modifiers"] = mods
        # Screen bbox from the 8 bounding-box corners (world space).
        pts = [project(o.matrix_world @ Vector(c)) for c in o.bound_box]
        pts = [p for p in pts if p]
        if pts:
            xs = [p[0] for p in pts]; ys = [p[1] for p in pts]; zs = [p[2] for p in pts]
            info["screen_bbox"] = [round(min(xs)), round(min(ys)), round(max(xs)), round(max(ys))]
            info["depth_range"] = [round(min(zs), 1), round(max(zs), 1)]
    if o.type == 'LIGHT':
        info["light"] = {"type": o.data.type, "energy": o.data.energy, "color": list(o.data.color),
                         "rot_deg": [round(math.degrees(a), 2) for a in o.rotation_euler]}
    rows.append(info)
world = bpy.context.scene.world
wi = {"name": world.name if world else None}
if world and world.use_nodes:
    wi["nodes"] = [(n.name, n.type) for n in world.node_tree.nodes]
sc = bpy.context.scene
res = {"objects": rows, "world": wi, "camera": sc.camera.name if sc.camera else None,
       "render": {"engine": sc.render.engine, "x": sc.render.resolution_x, "y": sc.render.resolution_y},
       "view": {"transform": sc.view_settings.view_transform, "look": sc.view_settings.look, "exposure": sc.view_settings.exposure}}
with open(OUT, "w", encoding="utf-8") as fh:
    json.dump(res, fh, indent=1)
print("INSPECT_DONE", len(rows))
