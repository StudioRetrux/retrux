# wl3a: real-loop blips per run + per group, dt band, boxes (CSS cols). usage: python3 rla.py RLDIR lo hi NAME=r1,r2 NAME=r3,...
import sys, json, os, numpy as np
R = sys.argv[1]; lo, hi = float(sys.argv[2]), float(sys.argv[3]); groups = [g.split("=") for g in sys.argv[4:]]
LU = np.array([0.2126, 0.7152, 0.0722], np.float32)
BOX = [("left", 0, 160), ("shelf", 160, 320), ("right", 320, 480)]
G = {}
for nm, runs in groups:
    acc = {b[0]: [] for b in BOX}; dts = []
    for r in runs.split(","):
        d = os.path.join(R, r)
        if not os.path.exists(d + "/meta.json"): print("missing", r); continue
        M = json.load(open(d + "/meta.json")); w, h, N = M["w"], M["h"], M["n"]
        A = np.fromfile(d + "/frames.bin", np.uint8).reshape(N, h, w, 4)[:, ::-1, :, :3].astype(np.float32) @ LU
        dd = np.diff(A, axis=0); bl = (np.abs(dd[:-1]) > 12) & (np.abs(dd[1:]) > 12) & (np.sign(dd[:-1]) != np.sign(dd[1:]))
        k = M["k"]; tt = np.array([f["t"] for f in M["info"]]); dt = np.concatenate([[tt[1] - tt[0]], np.diff(tt)]); dp = np.maximum(dt[1:-1], dt[2:])
        m = (dp >= lo) & (dp < hi); s = "%-6s %-10s n %3d dtp50 %.1f" % (nm, r, m.sum(), np.median(dt))
        for b, c0, c1 in BOX:
            y = bl[:, :, int(round(c0 * k)):int(round(c1 * k))].reshape(bl.shape[0], -1).sum(1).astype(float)
            acc[b].append(y[m]); s += " | %s all %.0f band %.0f" % (b, y.mean(), y[m].mean() if m.sum() else -1)
        dts.append(dp[m]); print(s)
    G[nm] = ({b: np.concatenate(v) for b, v in acc.items()}, np.concatenate(dts))
print("POOLED dt %g-%g:" % (lo, hi))
for nm, (acc, dts) in G.items():
    print("  %-6s n %4d dt mean %.2f | " % (nm, len(dts), dts.mean()) + " | ".join("%s %.0f" % (b, acc[b].mean()) for b, _, _ in BOX))
names = list(G)
if len(names) >= 2:
    a = names[0]
    print("1-ms bins left (vs %s):" % a)
    for t in range(int(lo), int(hi)):
        row = "  %d-%d" % (t, t + 1)
        for nm in names:
            acc, dts = G[nm]; mm = (dts >= t) & (dts < t + 1)
            row += "  %s n %3d %4.0f" % (nm, mm.sum(), acc["left"][mm].mean() if mm.sum() >= 10 else -1)
        print(row)
# dt-matched means over 1-ms bins where both have n >= 10, weighted by A's and by B's frame counts (left / shelf / right)
if len(names) >= 2:
    a, b = names[0], names[1]; (Aa, Ad), (Ba, Bd) = G[a], G[b]
    for wname in (a, b):
        row = "dt-matched (weights %s):" % wname
        for box in ("left", "shelf", "right"):
            sa = sb = sw = 0.0
            for t in range(int(lo), int(hi)):
                ma = (Ad >= t) & (Ad < t + 1); mb = (Bd >= t) & (Bd < t + 1)
                if ma.sum() >= 10 and mb.sum() >= 10:
                    w = ma.sum() if wname == a else mb.sum(); sa += w * Aa[box][ma].mean(); sb += w * Ba[box][mb].mean(); sw += w
            row += "  %s %s %.0f | %s %.0f (%+.0f %%, n %d)" % (box, a, sa / max(sw, 1), b, sb / max(sw, 1), 100 * (sb / max(sa, 1e-6) - 1), sw)
        print(row)
