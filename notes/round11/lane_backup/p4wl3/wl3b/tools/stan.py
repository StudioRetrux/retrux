# wl2g: same-pose analysis. args: TOOLS STDIR DPR(1|2) OUTPREFIX [cols...]  cols = capture dir names in STDIR (first = label order)
import sys, json, zlib, os, numpy as np
sys.path.insert(0, sys.argv[1]); from imgio import save
D = sys.argv[2]; dpr = int(sys.argv[3]); out = sys.argv[4]; cols = sys.argv[5:]
LU = np.array([0.2126, 0.7152, 0.0722], np.float32)
def seq(d):
    m = json.load(open(os.path.join(D, d, "meta.json"))); Wd = m["W"]; H = m["y1"] - m["y0"]; n = len(m["info"])
    fr = [np.frombuffer(zlib.decompress(open(os.path.join(D, d, "f%04d.bin" % k), "rb").read()), np.uint8).reshape(H, Wd, 4)[::-1, :, :3] for k in range(n)]
    return np.array(fr), m
def resample(A, Wt):
    # area-resample frames (n, H, W, 3) to width Wt (same aspect): GT at DPR 2's buffer
    n, H, Wd, _ = A.shape; s = Wt / Wd; Ht = int(round(H * s))
    xs = (np.arange(Wt) + 0.5) / s - 0.5; ys = (np.arange(Ht) + 0.5) / s - 0.5
    x0 = np.clip(np.floor(xs).astype(int), 0, Wd - 2); y0 = np.clip(np.floor(ys).astype(int), 0, H - 2); fx = (xs - x0)[None, None, :, None]; fy = (ys - y0)[None, :, None, None]
    A = A.astype(np.float32); a = A[:, y0][:, :, x0]; b = A[:, y0][:, :, x0 + 1]; c = A[:, y0 + 1][:, :, x0]; d = A[:, y0 + 1][:, :, x0 + 1]
    return np.clip(a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy + 0.5, 0, 255).astype(np.uint8)
S = {}
for c in cols:
    A, m = seq(c); S[c] = (A, m)
ref = S[cols[0]][1]; Wb = ref["W"]; Hb = ref["H"]; y0b = ref["y0"]
for c in cols:
    A, m = S[c]
    if m["W"] != Wb: S[c] = (resample(A, Wb), {**m, "W": Wb, "y0": int(round(m["y0"] * Wb / m["W"]))})
k = Wb / 1440.0   # css -> buffer
def bx(x0, y0, x1, y1, m): return (int(x0 * k), int(y0 * k) - m["y0"], int(x1 * k), min(int(y1 * k) - m["y0"], S[cols[0]][0].shape[1]))
def lum(A, b): x0, y0, x1, y1 = b; return A[:, y0:y1, x0:x1].astype(np.float32) @ LU
def blips(L, thr):
    dd = np.diff(L, axis=0); bl = (np.abs(dd[:-1]) > thr) & (np.abs(dd[1:]) > thr) & (np.sign(dd[:-1]) != np.sign(dd[1:]))
    return bl.reshape(bl.shape[0], -1).sum(1).mean()
def jit(L): return np.abs(L[2:] - 2 * L[1:-1] + L[:-2]).mean()
boxes = {"left 0-420x470-620": (0, 470, 420, 620), "shelfwater 280-480x440-520": (280, 440, 480, 520), "far 880-1440x430-590": (880, 430, 1440, 590)}
n = min(S[c][0].shape[0] for c in cols)
print("frames", n, "buffer", Wb, "dpr", dpr, "cols", " | ".join(cols))
for name, b0 in boxes.items():
    row = []
    for c in cols:
        A, m = S[c]; L = lum(A[:n], bx(*b0, m))
        row.append("%s %5.0f/%5.0f/%5.0f j%.2f" % (c, blips(L, 12), blips(L, 6), blips(L, 4), jit(L)))
    print("%-28s" % name, " | ".join(row))
def sheet(fn, b0, ks, z):
    colsimg = []
    for c in cols:
        A, m = S[c]; x0, y0, x1, y1 = bx(*b0, m)
        fr = [A[q, y0:y1, x0:x1].repeat(z, 0).repeat(z, 1) for q in ks]
        sep = np.full((3, fr[0].shape[1], 3), 255, np.uint8)
        col = np.concatenate(sum([[f, sep] for f in fr], [])[:-1], 0); colsimg += [col, np.full((col.shape[0], 6, 3), 255, np.uint8)]
    save(fn, np.concatenate(colsimg[:-1], 1))
ks = [int(v) for v in os.environ.get("KS", "98,99,100,101").split(",")]
sheet(out + "_shelf.png", boxes["shelfwater 280-480x440-520"], ks, 3 if dpr == 1 else 2)
sheet(out + "_left.png", (0, 500, 420, 610), ks, 2 if dpr == 1 else 1)
sheet(out + "_far.png", (900, 440, 1180, 560), ks, 2 if dpr == 1 else 1)
