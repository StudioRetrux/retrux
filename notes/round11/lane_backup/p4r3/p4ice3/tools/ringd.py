import sys, numpy as np, OpenImageIO as oiio
for p in sys.argv[1:]:
    a = oiio.ImageBuf(p).get_pixels(oiio.FLOAT)[..., :3] * 255.0
    l = a @ np.array([0.2126, 0.7152, 0.0722]); b = l[382:402, 680:770]; c = a[382:402, 680:770]
    print(p.split('/')[-2][-8:] + '/' + p.split('/')[-1][:20].ljust(20), f'ringD L{b.mean():.1f} sd{b.std():.1f} B-G{(c[...,2]-c[...,1]).mean():+.1f}')
