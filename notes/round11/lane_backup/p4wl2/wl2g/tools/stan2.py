# wl2g: same-pose blips per box at the first column's buffer scale; other-resolution columns (the 2x GT) are box-cropped and
# area-resampled (memory-light). args: TOOLS STDIR cols...
import sys, json, zlib, os, numpy as np
D = sys.argv[2]; cols = sys.argv[3:]
LU = np.array([0.2126, 0.7152, 0.0722], np.float32)
def meta(d): return json.load(open(os.path.join(D, d, "meta.json")))
def box_luma(d, box, Wb):
    m = meta(d); Wd = m["W"]; H = m["y1"] - m["y0"]; n = len(m["info"]); k = Wd / 1440.0
    x0, y0, x1, y1 = [int(round(v * k)) for v in box]; y0 -= m["y0"]; y1 = min(y1 - m["y0"], H)
    out = []
    for i in range(n):
        a = np.frombuffer(zlib.decompress(open(os.path.join(D, d, "f%04d.bin" % i), "rb").read()), np.uint8).reshape(H, Wd, 4)[::-1][y0:y1, x0:x1, :3].astype(np.float32) @ LU
        if Wd != Wb:
            s = Wb / Wd; h2 = int(round(a.shape[0] * s)); w2 = int(round(a.shape[1] * s))
            ys = np.minimum(((np.arange(h2) + 0.5) / s).astype(int), a.shape[0] - 1); xs = np.minimum(((np.arange(w2) + 0.5) / s).astype(int), a.shape[1] - 1)
            # box filter: average the source pixels falling into each target pixel
            yb = np.minimum((np.arange(a.shape[0]) * s).astype(int), h2 - 1); xb = np.minimum((np.arange(a.shape[1]) * s).astype(int), w2 - 1)
            acc = np.zeros((h2, w2), np.float32); cnt = np.zeros((h2, w2), np.float32)
            np.add.at(acc, (yb[:, None], xb[None, :]), a); np.add.at(cnt, (yb[:, None], xb[None, :]), 1)
            a = acc / np.maximum(cnt, 1)
        out.append(a)
    return np.array(out)
def blips(L, thr):
    dd = np.diff(L, axis=0); bl = (np.abs(dd[:-1]) > thr) & (np.abs(dd[1:]) > thr) & (np.sign(dd[:-1]) != np.sign(dd[1:]))
    return bl.reshape(bl.shape[0], -1).sum(1).mean()
Wb = meta(cols[0])["W"]
boxes = {"left 0-420x470-620": (0, 470, 420, 620), "shelfwater 280-480x440-520": (280, 440, 480, 520), "far 880-1440x430-590": (880, 430, 1440, 590)}
print("buffer", Wb, "cols", " | ".join(cols), "(blips thr 12 / 6 / 4)")
for name, b in boxes.items():
    Ls = [box_luma(c, b, Wb) for c in cols]; h = min(L.shape[1] for L in Ls); w = min(L.shape[2] for L in Ls); n = min(len(L) for L in Ls)
    print("%-28s" % name, " | ".join("%s %5.0f/%5.0f/%5.0f" % (c, blips(L[:n, :h, :w], 12), blips(L[:n, :h, :w], 6), blips(L[:n, :h, :w], 4)) for c, L in zip(cols, Ls)), "(rows %d)" % h)
