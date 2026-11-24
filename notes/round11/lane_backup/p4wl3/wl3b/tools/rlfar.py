# judge_wl2: far slabs / lips in the real loop (rl.mjs at 1440x766 DPR 2, CSS 860-1440 x 420-600). BPY -I rlfar.py TOOLS RLDIR OUT A B [x0 x1 y0 y1 buffer px]
import sys, json, os, numpy as np
sys.path.insert(0, sys.argv[1]); from imgio import save
R, out, a, b = sys.argv[2:6]
cr = [int(v) for v in sys.argv[6:10]] if len(sys.argv) > 9 else None
LU = np.array([0.2126, 0.7152, 0.0722], np.float32)
cols = []
for nm in (a, b):
    d = os.path.join(R, nm); M = json.load(open(d + "/meta.json")); w, h, N = M["w"], M["h"], M["n"]
    A = np.fromfile(d + "/frames.bin", np.uint8).reshape(N, h, w, 4)[:, ::-1, :, :3].astype(np.float32)
    if cr: A = A[:, cr[2]:cr[3], cr[0]:cr[1]]
    L = A @ LU; dd = np.diff(L, axis=0)
    bl = (np.abs(dd[:-1]) > 12) & (np.abs(dd[1:]) > 12) & (np.sign(dd[:-1]) != np.sign(dd[1:]))
    dt = np.array([f["dt"] for f in M["info"]]) * 1000
    per = bl.reshape(bl.shape[0], -1).sum(1)
    ok = (np.minimum(dt[1:-1], dt[2:]) >= 26) & (np.maximum(dt[1:-1], dt[2:]) <= 40)
    print("%-6s N %d %dx%d dt p50 %.1f | blips/frame all %.0f, dt 26-40 %.0f (n %d) | errs %d" % (nm, N, A.shape[2], A.shape[1], np.median(dt), per.mean(), per[ok].mean() if ok.sum() else -1, ok.sum(), len(M["errs"])))
    i0 = N // 2
    z = 2 if cr else 1
    t = [A[i0], A[i0 + 1], np.clip(np.abs(A[i0 + 1] - A[i0]) * 6, 0, 255)]
    hm = bl.sum(0).astype(np.float32); hm = np.clip(hm * 255.0 / max(6.0, np.percentile(hm, 99.5)), 0, 255)
    t.append(np.maximum(A[i0] * 0.5, np.stack([hm, hm * 0.2, hm * 0.1], -1)))
    t = [x.repeat(z, 0).repeat(z, 1) for x in t]
    sep = np.full((4, t[0].shape[1], 3), 255, np.float32)
    cols.append(np.concatenate(sum([[x, sep] for x in t], [])[:-1], 0))
    cols.append(np.full((cols[-1].shape[0], 6, 3), 255, np.float32))
save(out, np.concatenate(cols[:-1], 1))
