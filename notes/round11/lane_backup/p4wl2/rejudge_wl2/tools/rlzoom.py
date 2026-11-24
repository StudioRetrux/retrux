# judge_wl2: zoomed look at the left water in the real loop. BPY -I rlzoom.py TOOLS RLDIR OUT x0 x1 y0 y1(buffer px) z runA runB ...
import sys, json, os, numpy as np
sys.path.insert(0, sys.argv[1]); from imgio import save
R, out = sys.argv[2], sys.argv[3]; x0, x1, y0, y1, z = [int(v) for v in sys.argv[4:9]]; runs = sys.argv[9:]
LU = np.array([0.2126, 0.7152, 0.0722], np.float32); rows = []
for r in runs:
    d = os.path.join(R, r); M = json.load(open(d + "/meta.json")); w, h, N = M["w"], M["h"], M["n"]
    A = np.fromfile(d + "/frames.bin", np.uint8).reshape(N, h, w, 4)[:, ::-1, :, :3].astype(np.float32)
    dt = np.array([f["dt"] for f in M["info"]]) * 1000
    L = A @ LU; dd = np.diff(L, axis=0); bl = (np.abs(dd[:-1]) > 12) & (np.abs(dd[1:]) > 12) & (np.sign(dd[:-1]) != np.sign(dd[1:]))
    per = bl[:, y0:y1, x0:x1].reshape(bl.shape[0], -1).sum(1)
    ok = [i for i in range(5, N - 4) if all(29 <= dt[j] <= 34 for j in range(i, i + 3))]
    i0 = ok[len(ok) // 2] if ok else N // 2
    C = A[:, y0:y1, x0:x1]
    t = [C[i0], C[i0 + 1], C[i0 + 2], np.clip(np.abs(C[i0 + 1] - C[i0]) * 6, 0, 255), np.clip(np.abs(C[i0 + 2] - C[i0 + 1]) * 6, 0, 255)]
    t = [x.repeat(z, 0).repeat(z, 1) for x in t]
    sep = np.full((t[0].shape[0], 4, 3), 255, np.float32)
    rows += [np.concatenate(sum([[x, sep] for x in t], [])[:-1], 1), np.full((4, sum(x.shape[1] for x in t) + 4 * 4, 3), 255, np.float32)]
    print("%s frames %d-%d dt %s | crop blips/frame all %.0f" % (r, i0, i0 + 2, [round(float(dt[j]), 1) for j in range(i0, i0 + 3)], per.mean()))
save(out, np.concatenate(rows[:-1], 0))
