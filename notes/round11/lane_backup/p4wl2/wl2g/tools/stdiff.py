# wl2g: contrast-stretched frames + amplified frame-to-frame differences of a box. args: TOOLS STDIR OUT x0,y0,x1,y1(css) z ks cols...
import sys, json, zlib, os, numpy as np
sys.path.insert(0, sys.argv[1]); from imgio import save
D, out, box, z, ks = sys.argv[2], sys.argv[3], [int(v) for v in sys.argv[4].split(",")], int(sys.argv[5]), [int(v) for v in sys.argv[6].split(",")]
cols = sys.argv[7:]
LU = np.array([0.2126, 0.7152, 0.0722], np.float32)
def fr(d, k):
    m = json.load(open(os.path.join(D, d, "meta.json"))); Wd = m["W"]; H = m["y1"] - m["y0"]
    a = np.frombuffer(zlib.decompress(open(os.path.join(D, d, "f%04d.bin" % k), "rb").read()), np.uint8).reshape(H, Wd, 4)[::-1, :, :3]
    s = Wd / 1440.0; x0, y0, x1, y1 = [int(v * s) for v in box]; y0 -= m["y0"]; y1 -= m["y0"]
    return a[y0:y1, x0:x1].astype(np.float32) @ LU
rows = []
stats = []
for c in cols:
    F = [fr(c, k) for k in ks + [ks[-1] + 1]]
    mu = np.mean(F[0])
    st = [np.clip((f - mu) * 4 + 128, 0, 255) for f in F[:-1]]
    df = [np.clip(np.abs(F[i + 1] - F[i]) * 10, 0, 255) for i in range(len(ks))]
    stats.append("%s mean|d| %.2f" % (c, np.mean([np.abs(F[i + 1] - F[i]).mean() for i in range(len(ks))])))
    tiles = []
    for a in st + df:
        t = np.repeat(np.repeat(a, z, 0), z, 1); tiles += [t, np.full((t.shape[0], 4), 255)]
    rows += [np.concatenate(tiles[:-1], 1), np.full((4, sum(x.shape[1] for x in tiles[:-1])), 255)]
img = np.concatenate(rows[:-1], 0)
save(out, np.repeat(img[:, :, None], 3, 2))
print(" | ".join(stats))
