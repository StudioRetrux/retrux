# rejudge_wl2: per-run and per-1-ms-bin left-water blips (CSS 0-160) vs dt, real loop. BPY -I rlbin.py RLDIR A=r1,r2 B=r1,r2 [col0 col1 css]
import sys, json, os, numpy as np
R = sys.argv[1]; groups = [g.split("=") for g in sys.argv[2:4]]
c0, c1 = (float(sys.argv[4]), float(sys.argv[5])) if len(sys.argv) > 5 else (0, 160)
LU = np.array([0.2126, 0.7152, 0.0722], np.float32)
D = {}
for nm, runs in groups:
    X = []; Y = []
    for r in runs.split(","):
        d = os.path.join(R, r); M = json.load(open(d + "/meta.json")); w, h, N = M["w"], M["h"], M["n"]
        A = np.fromfile(d + "/frames.bin", np.uint8).reshape(N, h, w, 4)[:, ::-1, :, :3].astype(np.float32) @ LU
        dd = np.diff(A, axis=0); bl = (np.abs(dd[:-1]) > 12) & (np.abs(dd[1:]) > 12) & (np.sign(dd[:-1]) != np.sign(dd[1:]))
        k = M["k"]; e0, e1 = int(round(c0 * k)), int(round(c1 * k))
        y = bl[:, :, e0:e1].reshape(bl.shape[0], -1).sum(1).astype(float)
        dt = np.array([f["dt"] for f in M["info"]]) * 1000; dp = np.maximum(dt[1:-1], dt[2:])
        m = (dp >= 21) & (dp < 26)
        print("%-5s %-14s all %.0f | dt28-34 n %d mean %.0f" % (nm, r, y.mean(), m.sum(), y[m].mean()))
        X.append(dp); Y.append(y)
    D[nm] = (np.concatenate(X), np.concatenate(Y))
a, b = [g[0] for g in groups]
print("1-ms bins (dt = the larger of the two steps), n and mean blips:")
for lo in range(19, 28):
    ma = (D[a][0] >= lo) & (D[a][0] < lo + 1); mb = (D[b][0] >= lo) & (D[b][0] < lo + 1)
    if ma.sum() >= 15 and mb.sum() >= 15:
        print("  %d-%d  %s n %3d %.0f | %s n %3d %.0f  (%+.0f %%)" % (lo, lo + 1, a, ma.sum(), D[a][1][ma].mean(), b, mb.sum(), D[b][1][mb].mean(), 100 * (D[b][1][mb].mean() / D[a][1][ma].mean() - 1)))
# linear fit blips ~ dt per build, compare at common dt
for nm in (a, b):
    x, y = D[nm]; m = (x > 18) & (x < 30); p = np.polyfit(x[m], y[m], 1); D[nm] = D[nm] + (p,)
for t in (22, 23, 24, 25):
    va = np.polyval(D[a][2], t); vb = np.polyval(D[b][2], t)
    print("  fit at dt %d ms: %s %.0f | %s %.0f (%+.0f %%)" % (t, a, va, b, vb, 100 * (vb / va - 1)))
