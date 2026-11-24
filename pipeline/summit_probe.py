# Read-only: the massif's highest points and their rest-camera projections, plus the projected skyline for
# candidate rotations about a vertical axis through the summit.
#   blender -b plate_scene_v2.blend --python summit_probe.py -- <out.json>
import bpy, json, math, sys
import numpy as np
from mathutils import Euler, Matrix, Vector

OUT = sys.argv[sys.argv.index("--") + 1]
CAM = Vector((0.23183887899931777, -11.787528905312952, 2.903973052988094))
rot = Euler((math.radians(90.0 - 0.048456561917928444), 0.0, math.radians(0.672220988573093)), 'XYZ').to_matrix()
inv = rot.transposed()
F = 42.253045166243865 / 36.0 * 1440.0
m = bpy.data.objects["Object_2.008"]
mw = np.array(m.matrix_world)
co = np.empty(len(m.data.vertices) * 3, dtype=np.float64)
m.data.vertices.foreach_get("co", co)
co = co.reshape(-1, 3)
W = co @ mw[:3, :3].T + mw[:3, 3]
R = np.array(inv)


def project(P):
    c = (P - np.array(CAM)) @ R.T
    z = -c[:, 2]
    return 720.0 + F * c[:, 0] / z, 383.0 - F * c[:, 1] / z, z


u, v, z = project(W)
vis = (u > 150) & (u < 600) & (z > 0)
v = np.where(vis, v, 1e9)
order = np.argsort(v)[:400]   # highest on screen, inside the visible massif
tips = []
for i in order:
    if all(abs(u[i] - t["u"]) > 12 for t in tips):
        tips.append({"u": float(u[i]), "v": float(v[i]), "depth": float(z[i]), "world": [float(x) for x in W[i]]})
    if len(tips) >= 6:
        break
res = {"tips": tips, "skylines": {}}
top = W[np.argmin(v)]
for deg in (-40, -30, -20, -10, 0, 10, 20, 30, 40):
    a = math.radians(deg)
    Rz = np.array([[math.cos(a), -math.sin(a), 0], [math.sin(a), math.cos(a), 0], [0, 0, 1]])
    P = (W - top) @ Rz.T + top
    uu, vv, _ = project(P)
    sky = {}
    for x in range(0, 620, 4):
        sel = (uu >= x) & (uu < x + 4)
        if sel.any():
            sky[x] = round(float(vv[sel].min()), 1)
    res["skylines"][deg] = sky
json.dump(res, open(OUT, "w"), indent=1)
print("SUMMIT_DONE", tips[:3])
