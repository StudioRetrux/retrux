import sys, numpy as np, OpenImageIO as oiio
for p in sys.argv[1:]:
    a=oiio.ImageBuf(p).get_pixels(oiio.FLOAT)[..., :3]*255.0; l=a@np.array([0.2126,0.7152,0.0722])
    c=(l>250); c[300:500,600:840]=False
    ys,xs=np.nonzero(c)
    if len(xs): print(p.split('/')[-2], int(c.sum()), 'x', xs.min(), xs.max(), 'y', ys.min(), ys.max(), 'rows hist', np.histogram(ys, bins=[0,300,500,520,540,560,766])[0].tolist(), 'cols hist', np.histogram(xs,bins=[0,520,600,840,960,1440])[0].tolist())
    else: print(p, 0)
