# Motion-compensated residual between consecutive frames of a ring-stepped sequence (BPY python -I).
# For each pixel: min over integer shifts |s| <= 2 of |L1(x) - L0(x + s)|; mean over pixels where either frame is ice
# (mask: pixels whose luma changes between the two frames by > 1 in the unshifted diff OR all - here: the whole hero box,
# the background is frozen so it contributes ~0). Also p99. Usage: crawl.py <dir> <cfg> <t0> [n]
import sys
import numpy as np
import OpenImageIO as oiio
d, cfg, t0 = sys.argv[1], sys.argv[2], sys.argv[3]
n = int(sys.argv[4]) if len(sys.argv) > 4 else 6
def L(p):
    a = oiio.ImageBuf(p).get_pixels(oiio.FLOAT)[..., :3] * 255.0
    return a @ np.array([0.2126, 0.7152, 0.0722])
fr = [L(f"{d}/seq_{cfg}_{t0}_{i}.png") for i in range(n)]
res, p99, raw = [], [], []
for i in range(n - 1):
    a, b = fr[i], fr[i + 1]
    H, W = a.shape
    best = np.full((H - 4, W - 4), 1e9)
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            sh = a[2 + dy:H - 2 + dy, 2 + dx:W - 2 + dx]
            best = np.minimum(best, np.abs(b[2:H - 2, 2:W - 2] - sh))
    raw.append(np.abs(b - a).mean())
    m = np.abs(b[2:H - 2, 2:W - 2] - a[2:H - 2, 2:W - 2]) > 0.5  # pixels that changed (ice moving), background frozen
    res.append(best[m].mean() if m.any() else 0.0)
    p99.append(np.percentile(best[m], 99) if m.any() else 0.0)
print(f"{cfg} t{t0}: mc-residual {np.mean(res):.3f} (p99 {np.mean(p99):.1f}) raw |d| {np.mean(raw):.3f} changed-px {int(m.sum())}")
