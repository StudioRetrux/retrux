# fixer: two single frames, pixels whose luma moved > 4 levels, bbox, and the share inside the hero box x430-1010 y60-560
import sys, numpy as np, OpenImageIO as oiio
def L(p): return oiio.ImageBuf(p).get_pixels(oiio.FLOAT)[..., :3] * 255.0 @ np.array([0.2126, 0.7152, 0.0722])
for a, b in zip(sys.argv[1::2], sys.argv[2::2]):
    d = np.abs(L(a) - L(b)); m = d > 4; ys, xs = np.nonzero(m)
    hero = m[60:560, 430:1010].sum()
    print(f"{a.split('/')[-1]:28s} vs {b.split('/')[-1]:28s} px>4 {int(m.sum()):6d} (hero box {int(hero)}) mean|dL| {d.mean():.3f} bbox " + (f"x{xs.min()}-{xs.max()} y{ys.min()}-{ys.max()}" if m.any() else "-"))
