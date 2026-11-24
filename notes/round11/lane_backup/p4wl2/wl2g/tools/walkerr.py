# wl2g: the walk read's own error, isolated: E_t = F_t - PX_t (same stepped poses; band / anchored builds differ from the per-pixel
# walk build only in the walk read). Temporal instability of E: mean |E_{t+1} - E_t| and pixels with |dE| > thr; sheet of E.
# args: TOOLS STDIR PXDIR x0,y0,x1,y1(css) out.png z ks cols...
import sys, json, zlib, os, numpy as np
sys.path.insert(0, sys.argv[1]); from imgio import save
D, PXD, box, out, z, ks = sys.argv[2], sys.argv[3], [int(v) for v in sys.argv[4].split(",")], sys.argv[5], int(sys.argv[6]), [int(v) for v in sys.argv[7].split(",")]
cols = sys.argv[8:]
LU = np.array([0.2126, 0.7152, 0.0722], np.float32)
def seq(d):
    m = json.load(open(os.path.join(D, d, "meta.json"))); Wd = m["W"]; H = m["y1"] - m["y0"]; n = len(m["info"])
    s = Wd / m["vw"]; x0, y0, x1, y1 = [int(round(v * s)) for v in box]; y0 -= m["y0"]; y1 -= m["y0"]
    return np.array([np.frombuffer(zlib.decompress(open(os.path.join(D, d, "f%04d.bin" % k), "rb").read()), np.uint8).reshape(H, Wd, 4)[::-1, :, :3][y0:y1, x0:x1] for k in range(n)]).astype(np.float32) @ LU
P = seq(PXD)
rows = []
for c in cols:
    F = seq(c); n = min(len(F), len(P)); E = F[:n] - P[:n]; dE = np.abs(np.diff(E, axis=0))
    print("%-8s |E| %.2f  mean|dE| %.3f  px|dE|>3 %.0f  >6 %.0f  >12 %.0f /frame" % (c, np.abs(E).mean(), dE.mean(), (dE > 3).sum((1, 2)).mean(), (dE > 6).sum((1, 2)).mean(), (dE > 12).sum((1, 2)).mean()))
    t = [np.repeat(np.repeat(np.clip(E[k] * 8 + 128, 0, 255), z, 0), z, 1) for k in ks]
    tiles = sum([[a, np.full((a.shape[0], 4), 255)] for a in t], [])[:-1]
    rows += [np.concatenate(tiles, 1), np.full((4, sum(a.shape[1] for a in tiles)), 255)]
save(out, np.repeat(np.concatenate(rows[:-1], 0)[:, :, None], 3, 2))
