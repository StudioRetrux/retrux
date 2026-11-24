# wl3a: per-frame left-water blips series: median, mean, trimmed mean, top frames (spikes = re-anchors?)
import sys, json, os, numpy as np
R = sys.argv[1]; LU = np.array([0.2126, 0.7152, 0.0722], np.float32)
c0, c1 = float(sys.argv[2]), float(sys.argv[3])
for r in sys.argv[4:]:
    d = os.path.join(R, r); M = json.load(open(d + "/meta.json")); w, h, N = M["w"], M["h"], M["n"]
    A = np.fromfile(d + "/frames.bin", np.uint8).reshape(N, h, w, 4)[:, ::-1, :, :3].astype(np.float32) @ LU
    dd = np.diff(A, axis=0); bl = (np.abs(dd[:-1]) > 12) & (np.abs(dd[1:]) > 12) & (np.sign(dd[:-1]) != np.sign(dd[1:]))
    k = M["k"]; y = bl[:, :, int(round(c0 * k)):int(round(c1 * k))].reshape(bl.shape[0], -1).sum(1).astype(float)
    big = (np.abs(dd) > 12)[:, :, int(round(c0 * k)):int(round(c1 * k))].reshape(dd.shape[0], -1).sum(1)
    o = np.argsort(-y)[:6]
    print("%-8s mean %.0f med %.0f trim10 %.0f | top %s | chg>12 med %.0f max %d@%d" % (r, y.mean(), np.median(y), np.sort(y)[int(.05*len(y)):int(.95*len(y))].mean(), " ".join("%d@%d" % (y[i], i) for i in o), np.median(big), big.max(), big.argmax()))
