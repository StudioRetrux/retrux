import sys, json, numpy as np
def bl(d, thr=12):
    M = json.load(open(d + "/meta.json")); w, h, N = M["w"], M["h"], M["n"]
    A = np.fromfile(d + "/frames.bin", np.uint8).reshape(N, h, w, 4)[:, ::-1, :, :3].astype(np.float32) @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    dd = np.diff(A, axis=0); b = (np.abs(dd[:-1]) > thr) & (np.abs(dd[1:]) > thr) & (np.sign(dd[:-1]) != np.sign(dd[1:]))
    return b.sum(0).astype(np.float32) / (N - 2)
R = sys.argv[1]
for grp in sys.argv[2:]:
    nm, runs = grp.split("="); H = [bl(R + "/T1d2_" + r) for r in runs.split(",")]
    print("%-5s runs %d | blips/frame all %s | cols 0-200 (left water) %s | cols 200-400 (shelf water) %s | 400-600 %s" % (nm, len(H), " ".join("%.0f" % h.sum() for h in H), " ".join("%.0f" % h[:, :200].sum() for h in H), " ".join("%.0f" % h[:, 200:400].sum() for h in H), " ".join("%.0f" % h[:, 400:].sum() for h in H)))
