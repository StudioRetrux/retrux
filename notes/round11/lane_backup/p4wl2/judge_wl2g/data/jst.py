# judge_wl2g: same-pose stepped captures -> one-frame blips per box (thr 12/6/4) + a LOOK sheet of a box (cols = builds,
# rows = frames ks, then |frame diff| rows). All columns are box-resampled to the first column's buffer width (2x GT -> area mean).
# args: TOOLS OUT_PREFIX ZOOM KS(comma) NAME=DIR ...
import sys, json, zlib, os, numpy as np
sys.path.insert(0, sys.argv[1]); from imgio import save
OUT = sys.argv[2]; Z = int(sys.argv[3]); KS = [int(v) for v in sys.argv[4].split(",")]
cols = [a.split("=", 1) for a in sys.argv[5:]]
LU = np.array([0.2126, 0.7152, 0.0722], np.float32)
def meta(d): return json.load(open(os.path.join(d, "meta.json")))
Wb = meta(cols[0][1])["W"]; kb = Wb / 1440.0
def frames_box(d, box, idx=None):
    m = meta(d); Wd = m["W"]; H = m["y1"] - m["y0"]; n = m["frames"]; k = Wd / 1440.0
    x0, y0, x1, y1 = [int(round(v * k)) for v in box]; y0 -= m["y0"]; y1 = min(y1 - m["y0"], H)
    out = []
    for i in (range(n) if idx is None else idx):
        a = np.frombuffer(zlib.decompress(open(os.path.join(d, "f%04d.bin" % i), "rb").read()), np.uint8).reshape(H, Wd, 4)[::-1][y0:y1, x0:x1, :3].astype(np.float32)
        f = Wd // Wb if Wd > Wb and Wd % Wb == 0 else 1
        if f > 1:
            h2 = a.shape[0] // f; w2 = a.shape[1] // f
            a = a[:h2 * f, :w2 * f].reshape(h2, f, w2, f, 3).mean((1, 3))
        elif Wd != Wb:
            s = Wb / Wd; h2 = int(round(a.shape[0] * s)); w2 = int(round(a.shape[1] * s))
            yb = np.minimum((np.arange(a.shape[0]) * s).astype(int), h2 - 1); xb = np.minimum((np.arange(a.shape[1]) * s).astype(int), w2 - 1)
            acc = np.zeros((h2, w2, 3), np.float32); cnt = np.zeros((h2, w2, 1), np.float32)
            np.add.at(acc, (yb[:, None], xb[None, :]), a); np.add.at(cnt, (yb[:, None], xb[None, :]), 1)
            a = acc / np.maximum(cnt, 1)
        out.append(a)
    return out
def blips(fr, thr):
    L = np.array([f @ LU for f in fr]); dd = np.diff(L, axis=0)
    bl = (np.abs(dd[:-1]) > thr) & (np.abs(dd[1:]) > thr) & (np.sign(dd[:-1]) != np.sign(dd[1:]))
    return bl.reshape(bl.shape[0], -1).sum(1).mean()
BOX = {"left 0-420x470-620": (0, 470, 420, 620), "shelf 280-480x440-520": (280, 440, 480, 520), "far 880-1440x430-590": (880, 430, 1440, 590)}
if os.environ.get("NOBLIPS") != "1":
    for bn, b in BOX.items():
        row = []
        for nm, d in cols:
            fr = frames_box(d, b); row.append("%s %s" % (nm, "/".join("%.0f" % blips(fr, t) for t in (12, 6, 4))))
        print("%-24s thr12/6/4: %s" % (bn, " | ".join(row)), flush=True)
SB = tuple(int(v) for v in os.environ.get("SHEETBOX", "280,440,480,520").split(","))
G = float(os.environ.get("GAIN", "4"))
colimgs = []
for nm, d in cols:
    fr = frames_box(d, SB, KS)
    mu = np.mean([f.mean() for f in fr])
    tiles = [np.clip((f - mu) * G + 128, 0, 255) for f in fr]
    tiles += [np.clip(np.abs(fr[i + 1] - fr[i]) * 8, 0, 255) for i in range(len(fr) - 1)]
    tiles = [t.repeat(Z, 0).repeat(Z, 1) for t in tiles]
    sep = np.full((4, tiles[0].shape[1], 3), 255, np.float32)
    colimgs.append(np.concatenate(sum([[t, sep] for t in tiles], [])[:-1], 0))
H = max(c.shape[0] for c in colimgs)
colimgs = [np.pad(c, ((0, H - c.shape[0]), (0, 0), (0, 0)), constant_values=255) for c in colimgs]
vs = np.full((H, 8, 3), 255, np.float32)
save(OUT + ".png", np.concatenate(sum([[c, vs] for c in colimgs], [])[:-1], 1))
print("sheet", OUT + ".png", "cols", [c[0] for c in cols], "frames", KS, "then diffs x8; contrast x%g" % G)
