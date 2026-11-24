import sys; sys.path.insert(0, sys.argv[1]); import numpy as np
from fr import fr, luma
from imgio import save
J=sys.argv[2]
for ps in ['expand_2.97','release_0.33']:
    a=fr(f'{J}/caps/rest_{ps}_5163').astype(np.float32); b=fr(f'{J}/caps/rest_{ps}_5166').astype(np.float32)
    D=np.abs(luma(a)-luma(b)); ys,xs=np.nonzero(D>2)
    print(ps,'lane vs p4wl mean|d| %.3f max %.0f px>2 %d px>8 %d bbox>2 %s'%(D.mean(),D.max(),(D>2).sum(),(D>8).sum(),(xs.min(),ys.min(),xs.max(),ys.max()) if len(xs) else None))
    for nm,(x0,y0,x1,y1) in {'top 0-430':(0,0,1440,430),'left':(0,430,480,766),'mid':(480,430,880,766),'far':(880,430,1440,766)}.items():
        d=D[y0:y1,x0:x1]; print('   %-10s mean %.3f px>8 %d max %.0f'%(nm,d.mean(),(d>8).sum(),d.max()))
    out=np.concatenate([a,np.full((4,a.shape[1],3),255,np.float32),b,np.full((4,a.shape[1],3),255,np.float32),np.repeat(np.clip(D*8,0,255)[...,None],3,2)],0)
    save(f'{J}/img/hold_{ps}_p4wl_lane_diffx8.png',out[::2,::2])
