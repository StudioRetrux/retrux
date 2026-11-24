import sys, numpy as np, OpenImageIO as oiio
M,L=sys.argv[1],sys.argv[2]
def load(p): return oiio.ImageBuf(p).get_pixels(oiio.FLOAT)[..., :3]*255.0 @ np.array([0.2126,0.7152,0.0722])
def lap(l): return np.abs(4*l[1:-1,1:-1]-l[:-2,1:-1]-l[2:,1:-1]-l[1:-1,:-2]-l[1:-1,2:])
for pose in ['q00_rest','q01_loop15','q02_loop30','q03_eye','p04_expand_pop','p05_expand','p06_sustain','p07_release_snap','p08_release_home']:
    a=load(f'{M}/{pose}.png'); b=load(f'{L}/{pose}.png'); d=(np.abs(a-b)>2)[1:-1,1:-1]
    la,lb=lap(a),lap(b)
    newhf=(lb>40)&(la<20)&d; gone=(la>40)&(lb<20)&d
    ys,xs=np.nonzero(newhf)
    print(f'{pose:18s} lap mean on changed px main {la[d].mean():.2f} lane {lb[d].mean():.2f} | new HF px {int(newhf.sum())} removed HF px {int(gone.sum())}', list(zip((xs+1).tolist(),(ys+1).tolist()))[:6])
