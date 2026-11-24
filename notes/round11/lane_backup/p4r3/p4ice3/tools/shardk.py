# shardk.py : count saturated shard pixels (B-G > 55 or B-R > 90) in the panel boxes, and box stats with shard px masked out (+-2 px dilation)
import sys, numpy as np, OpenImageIO as oiio
B = {"q00_rest bandR": ("q00_rest", (790, 860, 352, 410)), "q01 innerBand": ("q01_loop15", (660, 780, 372, 406)),
     "q02 center": ("q02_loop30", (600, 840, 330, 420)), "q03 ringD": ("q03_eye", (680, 770, 382, 402)), "q03 outerR": ("q03_eye", (800, 830, 260, 350))}
def lapm(l):
    q = np.zeros_like(l); q[1:-1,1:-1] = np.abs(4*l[1:-1,1:-1]-l[:-2,1:-1]-l[2:,1:-1]-l[1:-1,:-2]-l[1:-1,2:]); return q
for lab, d in [x.split('=') for x in sys.argv[1:]]:
    for k, (pose, (x0, x1, y0, y1)) in B.items():
        a = oiio.ImageBuf(f'{d}/{pose}.png').get_pixels(oiio.FLOAT)[..., :3] * 255.0
        sh = ((a[..., 2] - a[..., 1]) > 55) | ((a[..., 2] - a[..., 0]) > 90)
        m = sh.copy()
        for _ in range(2):
            m = m | np.roll(m, 1, 0) | np.roll(m, -1, 0) | np.roll(m, 1, 1) | np.roll(m, -1, 1)
        l = a @ np.array([0.2126, 0.7152, 0.0722]); lp = lapm(l)
        keep = ~m[y0:y1, x0:x1]; c = l[y0:y1, x0:x1][keep]
        print(f"{lab:5s} {k:15s} shard px {int(sh[y0:y1, x0:x1].sum()):5d} | no-shard L{c.mean():6.1f} sd{c.std():5.1f} p5 {np.percentile(c,5):6.1f} lap{lp[y0:y1, x0:x1][keep].mean():5.1f}")
