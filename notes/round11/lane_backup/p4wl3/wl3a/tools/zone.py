# wl3a: mean luminance, temporal std and blips of a zone (CSS x0 x1 y0 y1; band starts at CSS y 440)
import sys, numpy as np
sys.path.insert(0, sys.argv[0].rsplit("/", 1)[0]); from capa import load, blips
x0, x1, y0, y1 = map(float, sys.argv[1:5])
for d in sys.argv[5:]:
    M, L = load(d); k = M["W"] / M["vw"]; Z = L[:, int((y0 - 440) * k):int((y1 - 440) * k), int(x0 * k):int(x1 * k)]
    b = blips(L)[:, int((y0 - 440) * k):int((y1 - 440) * k), int(x0 * k):int(x1 * k)]
    print("%-12s mean L %.1f | spatial std %.1f | |dL| frame-to-frame %.2f | blips/frame %.0f" % (d.split('/')[-1], Z.mean(), Z.std(axis=(1, 2)).mean(), np.abs(np.diff(Z, axis=0)).mean(), b.reshape(b.shape[0], -1).sum(1).mean()))
