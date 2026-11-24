# wl3b stepped analysis: blips (thr 12 / 6), jitter (2nd temporal diff) and |X - GT| per box. args TOOLS STDIR name=dir[:gtdir] ...
import sys, json, zlib, os, numpy as np
sys.path.insert(0, sys.argv[1])
D = sys.argv[2]; specs = sys.argv[3:]
LU = np.array([0.2126, 0.7152, 0.0722], np.float32)
def seq(d):
    m = json.load(open(os.path.join(D, d, "meta.json"))); Wd = m["W"]; H = m["y1"] - m["y0"]; n = len(m["info"])
    return np.array([np.frombuffer(zlib.decompress(open(os.path.join(D, d, "f%04d.bin" % k), "rb").read()), np.uint8).reshape(H, Wd, 4)[::-1, :, :3] for k in range(n)]), m
def down(A, f):  # area downsample by integer-ish factor via resample to width
    n, H, Wd, _ = A.shape; Wt = int(round(Wd / f)); Ht = int(round(H / f))
    xs = (np.arange(Wt) + 0.5) * f - 0.5; ys = (np.arange(Ht) + 0.5) * f - 0.5
    x0 = np.clip(np.floor(xs).astype(int), 0, Wd - 2); y0 = np.clip(np.floor(ys).astype(int), 0, H - 2); fx = (xs - x0)[None, None, :, None]; fy = (ys - y0)[None, :, None, None]
    A = A.astype(np.float32); a = A[:, y0][:, :, x0]; b = A[:, y0][:, :, x0 + 1]; c = A[:, y0 + 1][:, :, x0]; d = A[:, y0 + 1][:, :, x0 + 1]
    return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy
cache = {}
NMAX = int(os.environ.get("NMAX", "100000"))
def get(d, Wb=None):
    if d not in cache: cache[d] = seq(d)
    A, m = cache[d]; A = A[:NMAX]
    if Wb and m["W"] != Wb:
        f = m["W"] / Wb; return down(A, f), {**m, "W": Wb, "y0": m["y0"] / f}
    return A.astype(np.float32), m
boxes = {"left 0-420x470-620": (0, 470, 420, 620), "shelf 280-480x440-520": (280, 440, 480, 520), "far 880-1440x430-590": (880, 430, 1440, 590),
         "lips 880-1440x465-525": (880, 465, 1440, 525), "cols 880-1440x520-590": (880, 520, 1440, 590)}
first = specs[0].split("=")[1].split(":")[0]; _, m0 = get(first); Wb = m0["W"]; k = Wb / 1440.0
def lum(A, m, b): x0, y0, x1, y1 = b; return A[:, int(y0 * k - m["y0"]):int(y1 * k - m["y0"]), int(x0 * k):int(x1 * k)] @ LU
def blips(L, thr):
    dd = np.diff(L, axis=0); bl = (np.abs(dd[:-1]) > thr) & (np.abs(dd[1:]) > thr) & (np.sign(dd[:-1]) != np.sign(dd[1:])); return bl.reshape(bl.shape[0], -1).sum(1).mean()
def jit(L): return np.abs(L[2:] - 2 * L[1:-1] + L[:-2]).mean()
print("buffer W", Wb, "builds", " | ".join(specs))
for bn, b in boxes.items():
    row = []
    for s in specs:
        name, rest = s.split("="); d, *g = rest.split(":")
        A, m = get(d, Wb); L = lum(A, m, b); t = "%s b12 %6.1f b6 %6.1f j %.2f" % (name, blips(L, 12), blips(L, 6), jit(L))
        if g:
            G, mg = get(g[0], Wb); n = min(len(A), len(G)); LG = lum(G[:n], mg, b); t += " |dGT| %.2f gtb12 %.1f" % (np.abs(L[:n] - LG).mean(), blips(LG, 12))
        row.append(t)
    print("%-24s" % bn, " | ".join(row))
