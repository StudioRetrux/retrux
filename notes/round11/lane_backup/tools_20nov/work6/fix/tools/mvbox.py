# per path / box: reprojection motion (px / frame) of lake-plane points (y = 0) in each crawl box, from a capture's meta.json
import json, sys, math
BOXES = {"FS": [180, 600, 430, 720], "WR": [990, 650, 1215, 725], "DR": [350, 690, 660, 766], "FF": [0, 445, 680, 560],
         "FR": [900, 450, 1440, 515], "RS": [940, 590, 1440, 655]}
def rot(q, v):
    x, y, z, w = q
    # v' = q v q*
    ix = w * v[0] + y * v[2] - z * v[1]; iy = w * v[1] + z * v[0] - x * v[2]; iz = w * v[2] + x * v[1] - y * v[0]; iw = -x * v[0] - y * v[1] - z * v[2]
    return (ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x)
def conj(q): return (-q[0], -q[1], -q[2], q[3])
def proj(P, c):
    p = c["proj"]; pos = c["pos"]; q = conj(c["quat"])
    v = rot(q, (P[0] - pos[0], P[1] - pos[1], P[2] - pos[2]))
    cx = p[0] * v[0] + p[4] * v[1] + p[8] * v[2] + p[12]; cy = p[1] * v[0] + p[5] * v[1] + p[9] * v[2] + p[13]
    cw = p[3] * v[0] + p[7] * v[1] + p[11] * v[2] + p[15]
    return (cx / cw, cy / cw) if cw > 1e-6 else None
def ray(nx, ny, c):
    p = c["proj"]
    d = ((nx + p[8]) / p[0], (ny + p[9]) / p[5], -1.0)  # three's perspective: P[8], P[9] offsets enter with +z * (-1)
    return rot(c["quat"], d)
def pct(a, f):
    a = sorted(a); return a[min(len(a) - 1, int(f * len(a)))] if a else float("nan")
for mp in sys.argv[1:]:
    m = json.load(open(mp)); W, H = m["W"], m["H"]; info = m["info"]
    res = {}
    for b, (x0, y0, x1, y1) in BOXES.items():
        mv = []
        for k in range(1, len(info)):
            c, pc = info[k], info[k - 1]
            for gx in range(5):
                for gy in range(3):
                    x = x0 + (gx + 0.5) * (x1 - x0) / 5; y = y0 + (gy + 0.5) * (y1 - y0) / 3
                    nx = x / W * 2 - 1; ny = 1 - y / H * 2
                    d = ray(nx, ny, c)
                    if d[1] >= -1e-5: continue
                    t = -c["pos"][1] / d[1]; P = (c["pos"][0] + t * d[0], 0.0, c["pos"][2] + t * d[2])
                    a = proj(P, pc)
                    if a is None: continue
                    mv.append(math.hypot((a[0] - nx) * 0.5 * W, (a[1] - ny) * 0.5 * H))
        res[b] = mv
    print(mp.split("/")[-2], " ".join(f"{b}: p25 {pct(v,.25):.2f} p50 {pct(v,.5):.2f} p75 {pct(v,.75):.2f} p90 {pct(v,.9):.2f} |" for b, v in res.items()))
