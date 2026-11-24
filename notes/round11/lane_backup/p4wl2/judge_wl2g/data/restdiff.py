# rest look: lane vs base full-frame (same t, debug-frozen): where it differs (diff x8 map + stats by region). args: TOOLS A.png B.png OUT
import sys, numpy as np
sys.path.insert(0, sys.argv[1]); from imgio import load, save
A = load(sys.argv[2]); B = load(sys.argv[3]); D = np.abs(A - B).max(2)
H, W = D.shape; k = W / 1440.0
print("size %dx%d  max |d| %.0f  mean %.3f  px>1: %d  px>4: %d  px>12: %d" % (W, H, D.max(), D.mean(), (D > 1).sum(), (D > 4).sum(), (D > 12).sum()))
ys, xs = np.nonzero(D > 1)
if len(ys): print("bbox of |d|>1 (CSS px): x %.0f-%.0f  y %.0f-%.0f" % (xs.min() / k, xs.max() / k, ys.min() / k, ys.max() / k))
for nm, (x0, y0, x1, y1) in {"sky/env y<430": (0, 0, 1440, 430), "lake y>=430": (0, 430, 1440, 766)}.items():
    r = D[int(y0 * k):int(y1 * k), int(x0 * k):int(x1 * k)]; print("  %-14s max %.0f mean %.3f px>4 %d" % (nm, r.max(), r.mean(), (r > 4).sum()))
save(sys.argv[4], np.concatenate([A, np.clip(D[..., None].repeat(3, 2) * 8, 0, 255)], 0))
