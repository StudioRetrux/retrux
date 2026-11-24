# rest crops REF | 5162 | 5163 | 5166 (T1) and full-frame diff lane vs p4wl
import sys; sys.path.insert(0, sys.argv[1]); import numpy as np, json
from fr import fr, ref, luma
from imgio import save
J=sys.argv[2]; tier=sys.argv[3]; ports=sys.argv[4].split(',')
R=ref()
ims={p:fr(f'{J}/caps/rest_{tier}_{p}') for p in ports}
def crop(a,x0,y0,x1,y1,k): c=a[y0:y1,x0:x1].astype(np.float32); return np.repeat(np.repeat(c,k,0),k,1)
def sheet(boxes,k,name,withref=True):
    rows=[]
    for (x0,y0,x1,y1) in boxes:
        cs=([crop(R,x0,y0,x1,y1,k)] if withref else [])+[crop(ims[p],x0,y0,x1,y1,k) for p in ports]
        sep=np.full((cs[0].shape[0],4,3),255,np.float32)
        r=cs[0]
        for c in cs[1:]: r=np.concatenate([r,sep,c],1)
        rows.append(r)
    out=rows[0]
    for r in rows[1:]: out=np.concatenate([out,np.full((4,out.shape[1],3),255,np.float32),r],0)
    save(f'{J}/img/{name}',out)
sheet([(880,440,1440,600)],1,f'rest_{tier}_far_1x_REF_'+'_'.join(ports)+'.png')
sheet([(1000,460,1280,560)],2,f'rest_{tier}_far_2x_REF_'+'_'.join(ports)+'.png')
sheet([(0,440,480,620)],1,f'rest_{tier}_left_1x_REF_'+'_'.join(ports)+'.png')
# full-frame diff stats lane vs others
if '5166' in ports:
    L=luma(ims['5166'].astype(np.float32))
    for p in ports:
        if p=='5166': continue
        D=np.abs(L-luma(ims[p].astype(np.float32)))
        ys,xs=np.nonzero(D>2)
        print(tier,'5166 vs',p,'mean|d| %.3f max %.0f px>2 %d px>8 %d'%(D.mean(),D.max(),(D>2).sum(),(D>8).sum()), 'bbox>2', (xs.min(),ys.min(),xs.max(),ys.max()) if len(xs) else None)
        # per band
        for nm,(x0,y0,x1,y1) in {'sky/top 0-430':(0,0,1440,430),'left 0-480x430-766':(0,430,480,766),'mid 480-880x430-766':(480,430,880,766),'far 880-1440x430-766':(880,430,1440,766)}.items():
            d=D[y0:y1,x0:x1]; print('   %-22s mean %.3f px>2 %d px>8 %d max %.0f'%(nm,d.mean(),(d>2).sum(),(d>8).sum(),d.max()))
        m=np.clip(D*8,0,255); save(f'{J}/img/diff_{tier}_5166_vs_{p}_x8.png',np.repeat(m[...,None],3,2))
