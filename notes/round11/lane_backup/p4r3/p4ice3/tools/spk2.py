# isolated bright / dark pixels (> 25 levels above / below all 8 neighbours) in the hero region, per image (same-pose configs)
import sys, numpy as np, OpenImageIO as oiio
def L(p): return oiio.ImageBuf(p).get_pixels(oiio.FLOAT)[..., :3] * 255.0 @ np.array([0.2126, 0.7152, 0.0722])
def spk(l, thr=25):
    c = l[1:-1, 1:-1]; nb = [l[1+dy:l.shape[0]-1+dy, 1+dx:l.shape[1]-1+dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx]
    hi = np.all([c > n + thr for n in nb], axis=0); lo = np.all([c < n - thr for n in nb], axis=0)
    return hi, lo
for p in sys.argv[1:]:
    l = L(p)[30:700, 300:1140]
    hi, lo = spk(l)
    ys, xs = np.where(hi)
    print(p.split('/')[-1][:28].ljust(28), f'bright {hi.sum():3d} dark {lo.sum():3d}', ' '.join(f'({x+301},{y+31})' for x, y in list(zip(xs, ys))[:6]))
