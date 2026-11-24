# wl3b: real-loop (rl.mjs) dt-controlled one-frame blips over the whole captured region and sub-boxes (CSS rel. to the region).
# BPY -I rlband.py TOOLS RLDIR "name:x0,y0,x1,y1;..." build=run1,run2 ...   (boxes in CSS px relative to the region's origin)
import sys, json, os, numpy as np
R = sys.argv[2]; bx = [b.split(":") for b in sys.argv[3].split(";")]; groups = [g.split("=") for g in sys.argv[4:]]
LU = np.array([0.2126, 0.7152, 0.0722], np.float32)
pool = {}
for nm, runs in groups:
    P = []
    for r in runs.split(","):
        d = os.path.join(R, r); M = json.load(open(d + "/meta.json")); w, h, N = M["w"], M["h"], M["n"]; k = M["k"]
        A = np.fromfile(d + "/frames.bin", np.uint8).reshape(N, h, w, 4)[:, ::-1, :, :3]
        L = A.astype(np.float32) @ LU; dd = np.diff(L, axis=0)
        bl = (np.abs(dd[:-1]) > 12) & (np.abs(dd[1:]) > 12) & (np.sign(dd[:-1]) != np.sign(dd[1:]))
        dt = np.array([f["dt"] for f in M["info"]]) * 1000
        per = {}
        for bn, c in bx:
            x0, y0, x1, y1 = [int(round(float(v) * k)) for v in c.split(",")]
            per[bn] = bl[:, y0:y1, x0:x1].reshape(bl.shape[0], -1).sum(1)
        P.append((np.minimum(dt[1:-1], dt[2:]), np.maximum(dt[1:-1], dt[2:]), per))
        print("%-6s %-12s N %d dt p10/50/90 %.1f/%.1f/%.1f | %s | errs %d" % (nm, r, N, *np.percentile(dt, [10, 50, 90]), " ".join("%s %.0f" % (b, v.mean()) for b, v in per.items()), len(M["errs"])))
    pool[nm] = P
print("POOLED dt-controlled (both steps inside the band), blips / frame:")
for lo, hi in ((0, 999), (14, 20), (20, 26), (26, 30), (28, 34), (30, 36), (26, 40), (40, 48), (44, 56), (48, 52), (40, 60)):
    row = []
    for nm, P in pool.items():
        dlo = np.concatenate([p[0] for p in P]); dhi = np.concatenate([p[1] for p in P]); ok = (dlo >= lo) & (dhi <= hi)
        row.append("%s n %3d %s" % (nm, ok.sum(), " ".join("%s %5.0f" % (b, np.concatenate([p[2][b] for p in P])[ok].mean() if ok.sum() else -1) for b, _ in bx)))
    print("dt %3g-%-3g | " % (lo, hi) + " || ".join(row))
