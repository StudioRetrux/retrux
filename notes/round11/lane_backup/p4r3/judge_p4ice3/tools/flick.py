import sys, numpy as np, OpenImageIO as oiio
D=sys.argv[1]
def load(p):
    a=oiio.ImageBuf(p).get_pixels(oiio.FLOAT)[..., :3]*255.0
    return a @ np.array([0.2126,0.7152,0.0722])
def lap(l):
    return np.abs(4*l[1:-1,1:-1]-l[:-2,1:-1]-l[2:,1:-1]-l[1:-1,:-2]-l[1:-1,2:])
for seq in ['hold','sus','eye','rest']:
    M=[load(f'{D}/main/{seq}_{i:02d}.png') for i in range(10)]
    L=[load(f'{D}/lane/{seq}_{i:02d}.png') for i in range(10)]
    # ice mask: pixels where lane and main differ by > 3 lv in any frame, eroded-ish by requiring 2 frames
    diff=np.stack([np.abs(a-b)>3 for a,b in zip(M,L)]).sum(0)
    mask=diff>=2
    # exclude shards: pixels whose main temporal change is huge in both (shards move fast) -> use per-pixel max |d1| > 60 in main AND lane
    res={}
    for name,S in (('main',M),('lane',L)):
        d2=[np.abs(S[t+1]-2*S[t]+S[t-1]) for t in range(1,9)]
        d1=[np.abs(S[t+1]-S[t]) for t in range(0,9)]
        d2m=np.mean(d2,0); d1m=np.mean(d1,0)
        lp=np.mean([lap(s) for s in S],0)
        res[name]=(d2m,d1m,lp)
    big=(np.max([np.abs(M[t+1]-M[t]) for t in range(9)],0)>60)
    m2=mask & ~big
    m2c=m2[1:-1,1:-1]
    out=[f'{seq}: ice px {m2.sum()}']
    for name in ('main','lane'):
        d2m,d1m,lp=res[name]
        v2=d2m[m2]; v1=d1m[m2]
        out.append(f"{name} d2 mean {v2.mean():.2f} p95 {np.percentile(v2,95):.1f} p99 {np.percentile(v2,99):.1f} frac(d2>8) {(v2>8).mean()*100:.2f}% | d1 mean {v1.mean():.2f} | lap {lp[m2c].mean():.2f}")
    print(' | '.join(out[:1])); print('   '+out[1]); print('   '+out[2])
