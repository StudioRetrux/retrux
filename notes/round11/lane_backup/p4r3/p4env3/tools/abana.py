# A/B analysis: per shot, diff MAIN vs lane, connected clusters of |d|>2 (dilated), bbox, px count, max, mean signed luma.
import sys, os, glob
import numpy as np, OpenImageIO as oiio
def load(p):
    b=oiio.ImageBuf(p); s=b.spec(); return np.asarray(b.get_pixels(oiio.UINT8)).reshape(s.height,s.width,s.nchannels)[:,:,:3].astype(np.float32)
def save(p,a):
    a=np.clip(a,0,255).astype(np.uint8); h,w,c=a.shape; o=oiio.ImageOutput.create(p); o.open(p,oiio.ImageSpec(w,h,c,oiio.UINT8)); o.write_image(a); o.close()
def luma(a): return a[...,0]*0.2126+a[...,1]*0.7152+a[...,2]*0.0722
M, L, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True)
names = sorted(os.path.basename(p) for p in glob.glob(M+'/*.png'))
for n in names:
    if not os.path.exists(L+'/'+n): print(n,'missing'); continue
    a, b = load(M+'/'+n), load(L+'/'+n)
    d = np.abs(a-b).max(2); dl = luma(b)-luma(a)
    mask = d > 2
    tot = int(mask.sum())
    if tot == 0: print(f"{n:24s} IDENTICAL(>2) max {d.max():.0f}"); continue
    # coarse clustering on a 16px grid
    H, W = d.shape; g = 16
    gm = mask[:H//g*g,:W//g*g].reshape(H//g,g,W//g,g).any(axis=(1,3))
    # label connected grid cells (4-neighbour) via flood fill
    lab = np.zeros(gm.shape,int); k=0; clusters=[]
    for (i,j) in zip(*np.nonzero(gm)):
        if lab[i,j]: continue
        k+=1; st=[(i,j)]; lab[i,j]=k; cells=[]
        while st:
            y,x=st.pop(); cells.append((y,x))
            for dy,dx in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
                yy,xx=y+dy,x+dx
                if 0<=yy<gm.shape[0] and 0<=xx<gm.shape[1] and gm[yy,xx] and not lab[yy,xx]:
                    lab[yy,xx]=k; st.append((yy,xx))
        ys=[c[0] for c in cells]; xs=[c[1] for c in cells]
        x0,x1,y0,y1=min(xs)*g,(max(xs)+1)*g,min(ys)*g,(max(ys)+1)*g
        sub=mask[y0:y1,x0:x1]; n_px=int(sub.sum())
        clusters.append((n_px,x0,y0,x1,y1,float(d[y0:y1,x0:x1].max()), float(dl[y0:y1,x0:x1][sub].mean())))
    clusters.sort(reverse=True)
    print(f"{n:24s} n>2 {tot:6d} n>8 {int((d>8).sum()):5d} max {d.max():4.0f} clusters {len(clusters)}")
    for c in clusters[:6]:
        print(f"      px {c[0]:5d} box x{c[1]}-{c[3]} y{c[2]}-{c[4]} max {c[5]:.0f} mean dLuma {c[6]:+.1f}")
    dm = np.repeat((d*8)[...,None],3,2); save(f"{OUT}/diff_{n}", dm)
