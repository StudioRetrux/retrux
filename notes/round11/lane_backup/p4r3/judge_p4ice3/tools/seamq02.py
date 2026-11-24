import sys, numpy as np, OpenImageIO as oiio
def L(p): return oiio.ImageBuf(p).get_pixels(oiio.FLOAT)[..., :3]*255.0 @ np.array([0.2126,0.7152,0.0722])
for p in sys.argv[1:]:
    l=L(p)
    o=[]
    for (y0,y1,x0,x1) in ((360,395,540,620),(360,395,830,890)):
        r=l[y0:y1,x0:x1].mean(0); k=int(np.argmin(r)); fld=np.percentile(r,90)
        thr=(fld+r[k])/2; lo=k
        while lo>0 and r[lo-1]<thr: lo-=1
        hi=k
        while hi<len(r)-1 and r[hi+1]<thr: hi+=1
        o.append(f'x{x0}-{x1}: min {r[k]:.0f}@{x0+k} fld {fld:.0f} depth {100*(1-r[k]/fld):.0f}% width {hi-lo+1}px')
    print(p.split('/')[-2][-10:]+'/'+p.split('/')[-1], ' | '.join(o))
