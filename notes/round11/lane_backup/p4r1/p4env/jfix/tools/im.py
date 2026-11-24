# fixer image helper (Blender python -I): box | grid
import sys
import numpy as np
import OpenImageIO as oiio
def load(p):
    b = oiio.ImageBuf(p); s = b.spec()
    return np.asarray(b.get_pixels(oiio.UINT8)).reshape(s.height, s.width, s.nchannels)[:, :, :3].astype(np.float32)
def save(p, a):
    a = np.clip(a, 0, 255).astype(np.uint8); h, w, c = a.shape
    o = oiio.ImageOutput.create(p); o.open(p, oiio.ImageSpec(w, h, c, oiio.UINT8)); o.write_image(a); o.close()
def luma(a): return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722
cmd = sys.argv[1]
if cmd == 'box':  # box x0 x1 y0 y1 imgs...
    x0, x1, y0, y1 = map(int, sys.argv[2:6])
    for p in sys.argv[6:]:
        b = load(p)[y0:y1 + 1, x0:x1 + 1]; L = luma(b)
        print(f"{p.split('/')[-2]}/{p.split('/')[-1]:24s} [{x0}-{x1},{y0}-{y1}] luma {L.mean():6.1f} rgb {b.reshape(-1,3).mean(0).round(1).tolist()} p5 {np.percentile(L,5):.0f} p95 {np.percentile(L,95):.0f}")
elif cmd == 'grid':  # grid out x,y,w,h scale cols imgs...
    out = sys.argv[2]; x, y, w, h = map(int, sys.argv[3].split(',')); sc = int(sys.argv[4]); cols = int(sys.argv[5])
    ims = [np.repeat(np.repeat(load(p)[y:y + h, x:x + w], sc, 0), sc, 1) for p in sys.argv[6:]]
    H, Wd = ims[0].shape[:2]; rows = (len(ims) + cols - 1) // cols
    g = np.full((rows * (H + 4), cols * (Wd + 4), 3), 255.0)
    for i, im in enumerate(ims):
        r, c = divmod(i, cols); g[r * (H + 4):r * (H + 4) + im.shape[0], c * (Wd + 4):c * (Wd + 4) + im.shape[1]] = im
    save(out, g)
elif cmd == 'diff':  # diff a b [thr]  -> count / bbox / max
    a, b = load(sys.argv[2]), load(sys.argv[3]); thr = float(sys.argv[4]) if len(sys.argv) > 4 else 2
    d = np.abs(a - b).max(2); ys, xs = np.nonzero(d > thr)
    print(f"max {d.max():.0f} n>{thr:g} {len(xs)} bbox {(xs.min(), ys.min(), xs.max(), ys.max()) if len(xs) else None}")
