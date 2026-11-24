# p4hold: vertical background shift between two 1440x766 frames by block matching on gradient magnitude (robust to haze),
# in edge strips the rings / shards rarely cover. usage: bgshift.py A.png B.png [label]  -> shift of B relative to A (+ = B lower)
import sys, numpy as np, OpenImageIO as oiio
def load(p):
    b = oiio.ImageBuf(p); a = b.get_pixels(oiio.FLOAT)[:, :, :3]
    l = a @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    gy, gx = np.gradient(l)
    return l, np.hypot(gx, gy)
A, Ag = load(sys.argv[1]); B, Bg = load(sys.argv[2]); lab = sys.argv[3] if len(sys.argv) > 3 else ""
regions = {"L_peak x0-300 y260-420": (0, 300, 260, 420), "L_base x0-300 y520-660": (0, 300, 520, 660),
           "R_berg x1180-1440 y300-460": (1180, 1440, 300, 460), "R_shore x1180-1440 y560-660": (1180, 1440, 560, 660),
           "L_floes x0-300 y600-720": (0, 300, 600, 720)}
out = []
for name, (x0, x1, y0, y1) in regions.items():
    best = []
    for bx in range(x0, x1 - 63, 32):
        for by in range(y0, y1 - 31, 16):
            pa = Ag[by:by + 32, bx:bx + 64]
            if pa.std() < 0.004: continue
            errs = []
            for s in range(-45, 46):
                if by + s < 0 or by + s + 32 > B.shape[0]: errs.append(1e9); continue
                pb = Bg[by + s:by + s + 32, bx:bx + 64]
                errs.append(np.abs(pa - pb).mean())
            errs = np.array(errs); i = int(errs.argmin())
            # sub-pixel parabola
            sub = 0.0
            if 0 < i < len(errs) - 1:
                d = errs[i - 1] - 2 * errs[i] + errs[i + 1]
                if d > 0: sub = 0.5 * (errs[i - 1] - errs[i + 1]) / d
            best.append((i - 45 + sub, errs[i] / max(1e-6, np.median(errs))))
    if best:
        sh = np.array([b[0] for b in best]); q = np.array([b[1] for b in best])
        good = sh[q < 0.6] if (q < 0.6).sum() >= 3 else sh
        out.append(f"{name:28s} shift {np.median(good):+6.1f} px (blocks {len(good)}/{len(sh)}, iqr {np.percentile(good,25):+.1f}..{np.percentile(good,75):+.1f})")
print(lab); print("\n".join(out))
