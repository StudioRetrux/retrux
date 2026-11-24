import sys, numpy as np, OpenImageIO as oiio
M,L=sys.argv[1],sys.argv[2]
def load(p):
    return oiio.ImageBuf(p).get_pixels(oiio.FLOAT)[..., :3]*255.0 @ np.array([0.2126,0.7152,0.0722])
def spk(l, thr=25):
    c=l[1:-1,1:-1]; nb=[l[1+dy:l.shape[0]-1+dy, 1+dx:l.shape[1]-1+dx] for dy in (-1,0,1) for dx in (-1,0,1) if (dy,dx)!=(0,0)]
    hi=np.all([c-n>thr for n in nb],0); lo=np.all([n-c>thr for n in nb],0)
    return hi, lo
for pose in ['q00_rest','q01_loop15','q02_loop30','q03_eye','p04_expand_pop','p05_expand','p06_sustain','p07_release_snap','p08_release_home']:
    a=load(f'{M}/{pose}.png'); b=load(f'{L}/{pose}.png')
    diff=np.abs(a-b)>2  # ice-changed pixels only
    d=diff[1:-1,1:-1]
    r=[]
    for nm,img in (('main',a),('lane',b)):
        hi,lo=spk(img); r.append(f'{nm} bright {int((hi&d).sum())} dark {int((lo&d).sum())}')
    hi,lo=spk(b); ys,xs=np.nonzero((hi|lo)&d)
    print(pose, ' | '.join(r), ' lane locs', list(zip((xs+1).tolist(),(ys+1).tolist()))[:8])
