# judge_wl3a: same-pose stepped captures (capdt/cap format). Blip counts per zone (|dL|>12 both steps, sign flip) and a sheet.
# BPY -I stj.py blips DIR...            -> per-dir mean blips/frame per zone
# BPY -I stj.py sheet OUT ZOOM x0 x1 y0 y1 k0 DIR...   (CSS coords at the capture's vw) rows = dirs, cols = 4 frames + 3 diffs x6
import sys, json, zlib, numpy as np, OpenImageIO as oiio
LU = np.array([0.2126, 0.7152, 0.0722], np.float32)
def load(d, i, m):
    W = m["W"]; H = m["y1"] - m["y0"]
    return np.frombuffer(zlib.decompress(open(d + "/f%04d.bin" % i, "rb").read()), np.uint8).reshape(H, W, 4)[::-1, :, :3].astype(np.float32)
def kk(m): return m["W"] / float(m.get("vw", 1440))
if sys.argv[1] == "blips":
    Z = {"left0-160": (0, 160, 440, 620), "region0-480": (0, 480, 440, 620), "shelf280-480x440-520": (280, 480, 440, 520), "near0-100x575-620": (0, 100, 575, 620), "right160-480": (160, 480, 440, 620)}
    for d in sys.argv[2:]:
        m = json.load(open(d + "/meta.json")); k = kk(m); n = m["frames"]
        A = np.stack([load(d, i, m) @ LU for i in range(n)])
        dd = np.diff(A, axis=0); bl = (np.abs(dd[:-1]) > 12) & (np.abs(dd[1:]) > 12) & (np.sign(dd[:-1]) != np.sign(dd[1:]))
        s = []
        for z, (x0, x1, y0, y1) in Z.items():
            r0, r1 = int(round(y0 * k)) - m["y0"], int(round(y1 * k)) - m["y0"]; e0, e1 = int(round(x0 * k)), int(round(x1 * k))
            r0 = max(r0, 0); s.append("%s %.0f" % (z, bl[:, r0:r1, e0:e1].reshape(bl.shape[0], -1).sum(1).mean()))
        print("%-12s n %d k %.3f | %s" % (d.split("/")[-1], n, k, " | ".join(s)))
else:
    out, z = sys.argv[2], int(sys.argv[3]); x0, x1, y0, y1, k0 = map(float, sys.argv[4:9]); dirs = sys.argv[9:]; ks = [int(k0) + j for j in range(4)]
    rows = []
    for d in dirs:
        m = json.load(open(d + "/meta.json")); k = kk(m)
        r0, r1 = int(round(y0 * k)) - m["y0"], int(round(y1 * k)) - m["y0"]; e0, e1 = int(round(x0 * k)), int(round(x1 * k))
        C = [load(d, i, m)[max(r0, 0):r1, e0:e1] for i in ks]
        D = [np.repeat((np.abs((C[i + 1] - C[i]) @ LU) * 6)[:, :, None], 3, 2) for i in range(3)]
        sep = np.full((C[0].shape[0], 3, 3), 128.0)
        rows.append(np.concatenate(sum([[x, sep] for x in C + D], [])[:-1], 1)); rows.append(np.full((3, rows[-1].shape[1], 3), 128.0))
    w = min(r.shape[1] for r in rows); img = np.concatenate([r[:, :w] for r in rows[:-1]], 0)
    img = np.kron(img, np.ones((z, z, 1))); img = np.clip(img, 0, 255).astype(np.uint8)
    o = oiio.ImageOutput.create(out); o.open(out, oiio.ImageSpec(img.shape[1], img.shape[0], 3, "uint8")); o.write_image(img); o.close(); print(out, img.shape)
