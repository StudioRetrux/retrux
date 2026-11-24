# Read-only: fit a rigid ground-plane motion of the range (Object_2.008) so that, seen from the rest camera,
# its features land where the reference has them. Works on the ORIGINAL plate scene (no v2 transform).
#   blender -b plate_scene.blend --python massif_fit.py -- <out.json>
# Features (original engine plate -> reference ref_F000, 1440x766):
#   right summit tip   (335, 220) -> (290, 210)      (the left tip, (300, 220), hides in the reference's wisp)
#   left shoulder      (160, 300) -> (105, 295)
#   ridge peak         ( 20, 260) -> ( 55, 285)
import bpy, json, math, sys
import numpy as np
from mathutils import Euler

OUT = sys.argv[sys.argv.index("--") + 1]
CAM = np.array((0.23183887899931777, -11.787528905312952, 2.903973052988094))
rot = np.array(Euler((math.radians(90.0 - 0.048456561917928444), 0.0, math.radians(0.672220988573093)), 'XYZ').to_matrix())
R = rot.T
F = 42.253045166243865 / 36.0 * 1440.0
m = bpy.data.objects["Object_2.008"]
mw = np.array(m.matrix_world)
co = np.empty(len(m.data.vertices) * 3, dtype=np.float64)
m.data.vertices.foreach_get("co", co)
W = co.reshape(-1, 3) @ mw[:3, :3].T + mw[:3, 3]


def project(P):
    c = (P - CAM) @ R.T
    z = -c[:, 2]
    return 720.0 + F * c[:, 0] / z, 383.0 - F * c[:, 1] / z, z


u, v, z = project(W)


def top_in(u0, u1):
    sel = np.where((u >= u0) & (u < u1) & (z > 0))[0]
    i = sel[np.argmin(v[sel])]
    return i


# Skyline features of the original geometry.
feat_idx = {
    "tip_right": top_in(320, 350),
    "tip_left": top_in(290, 312),
    "ridge": top_in(0, 60),
}
# The left shoulder: the skyline point at u ~160.
feat_idx["shoulder"] = top_in(150, 170)
targets = {"tip_right": (290, 210), "ridge": (55, 285), "shoulder": (105, 295)}
info = {k: {"u": float(u[i]), "v": float(v[i]), "depth": float(z[i]), "world": W[i].tolist()} for k, i in feat_idx.items()}
print("FEATURES", json.dumps(info))


def transform(P, th, tx, ty, s, piv):
    c, sn = math.cos(th), math.sin(th)
    Rz = np.array([[c, -sn, 0], [sn, c, 0], [0, 0, 1]])
    return ((P - piv) * s) @ Rz.T + piv + np.array([tx, ty, 0.0])


piv = W[feat_idx["tip_right"]].copy()
piv[2] = 0.0
best = None
for th_deg in np.arange(-30, 30.01, 1.0):
    for s in (0.94, 0.97, 1.0, 1.03, 1.06):
        for tx in np.arange(-12, 12.01, 1.0):
            for ty in np.arange(-30, 30.01, 2.0):
                err = 0.0
                for k, (tu, tv) in targets.items():
                    P = transform(W[feat_idx[k]][None, :], math.radians(th_deg), tx, ty, s, piv)
                    pu, pv, pz = project(P)
                    w = 1.0 if k != "ridge" else 0.7
                    err += w * ((pu[0] - tu) ** 2 + (pv[0] - tv) ** 2)
                if best is None or err < best[0]:
                    best = (err, th_deg, tx, ty, s)
err, th_deg, tx, ty, s = best
res = {"features": info, "best": {"rms_px": math.sqrt(err / 3.0), "theta_deg": th_deg, "tx": tx, "ty": ty, "scale": s,
                                  "pivot": piv.tolist()}}
for k in feat_idx:
    P = transform(W[feat_idx[k]][None, :], math.radians(th_deg), tx, ty, s, piv)
    pu, pv, pz = project(P)
    res["best"][k] = [round(float(pu[0]), 1), round(float(pv[0]), 1), round(float(pz[0]), 1)]
json.dump(res, open(OUT, "w"), indent=1)
print("FIT_DONE", json.dumps(res["best"]))
