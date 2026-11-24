# judge_wl3a: real-loop one-frame blips (|dL|>12 both steps, sign flip) per frame, binned by dt; dt-matched comparison.
# BPY -I rlj.py RLDIR A=r1,r2,.. B=r1,r2,.. [lo hi]   (lo/hi = pooled band in ms of the engine dt, default auto)
import sys, json, os, numpy as np
R = sys.argv[1]; groups = [g.split("=") for g in sys.argv[2:4]]
LU = np.array([0.2126, 0.7152, 0.0722], np.float32)
ZONES = {"left0-160": (0, 160, 440, 620), "region": (0, 480, 440, 620), "shelf280-480x440-520": (280, 480, 440, 520), "near0-100x575-620": (0, 100, 575, 620)}
D = {}
for nm, runs in groups:
    acc = {z: [] for z in ZONES}; DT = []; GAP = []
    for r in runs.split(","):
        d = os.path.join(R, r); M = json.load(open(d + "/meta.json")); w, h, N = M["w"], M["h"], M["n"]; k = M["k"]
        A = np.fromfile(d + "/frames.bin", np.uint8).reshape(N, h, w, 4)[:, ::-1, :, :3].astype(np.float32) @ LU
        dd = np.diff(A, axis=0); bl = (np.abs(dd[:-1]) > 12) & (np.abs(dd[1:]) > 12) & (np.sign(dd[:-1]) != np.sign(dd[1:]))
        dt = np.array([f["dt"] for f in M["info"]]) * 1000; t = np.array([f["t"] for f in M["info"]]); gp = np.r_[np.nan, np.diff(t)]
        dp = np.maximum(dt[1:-1], dt[2:]); gq = np.maximum(gp[1:-1], gp[2:])
        s = []
        for z, (x0, x1, y0, y1) in ZONES.items():
            e0, e1 = int(round(x0 * k)), int(round(x1 * k)); r0, r1 = int(round((y0 - 440) * k)), int(round((y1 - 440) * k))
            y = bl[:, r0:r1, e0:e1].reshape(bl.shape[0], -1).sum(1).astype(float); acc[z].append(y); s.append("%s %.0f" % (z.split("0")[0] if z != "region" else z, y.mean()))
        DT.append(dp); GAP.append(gq)
        print("%-3s %-8s dt p50 %.1f gap p50 %.1f | %s" % (nm, r, np.median(dt), np.nanmedian(gp), " | ".join(s)))
    D[nm] = (np.concatenate(DT), np.concatenate(GAP), {z: np.concatenate(v) for z, v in acc.items()})
a, b = [g[0] for g in groups]
for key, idx in (("engine dt", 0), ("real gap", 1)):
    xa, xb = D[a][idx], D[b][idx]
    print("== dt-matched on %s (1-ms bins, both n>=10): %s weights / %s weights" % (key, a, b))
    for z in ZONES:
        ya, yb = D[a][2][z], D[b][2][z]; sa = sb = wa = wb = 0.0; na = nb = 0; Ea = Eb = Fa = Fb = 0.0
        for lo in range(10, 80):
            ma = (xa >= lo) & (xa < lo + 1); mb = (xb >= lo) & (xb < lo + 1)
            if ma.sum() >= 10 and mb.sum() >= 10:
                va, vb = ya[ma].mean(), yb[mb].mean()
                Ea += ma.sum() * va; Eb += ma.sum() * vb; Fa += mb.sum() * va; Fb += mb.sum() * vb; na += ma.sum(); nb += mb.sum()
        if na:
            print("  %-22s matched n %d | %d : %s %.0f vs %s %.0f (%+.0f %%) | %s-weighted %.0f vs %.0f (%+.0f %%)" % (z, na, nb, a, Ea / na, b, Eb / na, 100 * (Eb / Ea - 1), b, Fa / nb, Fb / nb, 100 * (Fb / Fa - 1)))
lo, hi = (float(sys.argv[4]), float(sys.argv[5])) if len(sys.argv) > 5 else (None, None)
if lo is not None:
    print("== pooled engine-dt band %g-%g ms" % (lo, hi))
    for z in ZONES:
        out = []
        for nm in (a, b):
            m = (D[nm][0] >= lo) & (D[nm][0] < hi); out.append("%s n %d mean %.0f dtmean %.1f" % (nm, m.sum(), D[nm][2][z][m].mean() if m.sum() else -1, D[nm][0][m].mean() if m.sum() else -1))
        print("  %-22s %s" % (z, " | ".join(out)))
