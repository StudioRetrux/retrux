import sys, numpy as np, OpenImageIO as oiio
def L(p): a = oiio.ImageBuf(p).get_pixels(oiio.FLOAT)[..., :3] * 255.0; return a @ np.array([0.2126, 0.7152, 0.0722]), a
for p in sys.argv[1:]:
    l, a = L(p)
    o = []
    for (x0, x1, y0, y1) in ((800, 830, 260, 350), (790, 840, 230, 330), (820, 860, 300, 380)):
        b = l[y0:y1, x0:x1]; c = a[y0:y1, x0:x1]
        o.append(f'{b.mean():.1f}/sd{b.std():.1f}/BG{(c[...,2]-c[...,1]).mean():+.0f}')
    print(p.split('/')[-1][:24].ljust(24), ' | '.join(o))
