import sys, numpy as np, OpenImageIO as oiio
def load(p):
    a = oiio.ImageBuf(p).get_pixels(oiio.FLOAT); return a[..., :3]*255.0
def L(a): return a @ np.array([0.2126,0.7152,0.0722])
# usage: prof.py x y0 y1 [vertical] img...   or  h y x0 x1 img...
mode=sys.argv[1]; c=int(sys.argv[2]); a0=int(sys.argv[3]); a1=int(sys.argv[4])
for p in sys.argv[5:]:
    im=load(p); l=L(im)
    if mode=='v': seg=l[a0:a1, c]; rgb=im[a0:a1,c]
    else: seg=l[c, a0:a1]; rgb=im[c,a0:a1]
    print(p.split('/')[-3][:10]+'/'+p.split('/')[-1][:14], ' '.join(f'{v:3.0f}' for v in seg))
    print('   B-G     ', ' '.join(f'{v:3.0f}' for v in (rgb[:,2]-rgb[:,1])))
