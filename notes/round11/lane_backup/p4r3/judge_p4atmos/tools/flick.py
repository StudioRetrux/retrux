import sys, os, glob; sys.path.insert(0, os.path.dirname(__file__)); from jl import *
J='/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4atmos'
S={}
for w in ['main','lane']:
    fs=sorted(glob.glob(f'{J}/caps/{w}_hold/hs_*.png')); ims=np.stack([luma(load(f)) for f in fs])
    S[w]=ims
    for nm,(x0,y0,x1,y1) in {'bank_left x0-260 y440-600':(0,440,260,600),'bank_right x1150-1440 y480-600':(1150,480,1440,600),'massif x0-300 y340-440':(0,340,300,440)}.items():
        c=ims[:,y0:y1,x0:x1]; d=np.abs(np.diff(c,axis=0)).mean((1,2)); m=c.mean((1,2)); dm=np.diff(m)
        hf=np.abs(np.diff(c,n=2,axis=0)).mean()
        print(f'{w} {nm:30s} pix|dI| {d.mean():.2f} (max {d.max():.2f})  mean {m.min():.1f}..{m.max():.1f}  pix 2nd-diff {hf:.2f}')
# temporal std map of the lane minus main (where does the lane add temporal variation?)
sd=S['lane'].std(0)-S['main'].std(0)
print('lane-main temporal sd: p99 %.2f max %.2f; area sd>+2: %.2f%%'%(np.percentile(sd,99),sd.max(),(sd>2).mean()*100))
ys,xs=np.nonzero(sd>2); print('bbox of sd>+2:', xs.min() if len(xs) else -1, xs.max() if len(xs) else -1, ys.min() if len(ys) else -1, ys.max() if len(ys) else -1)
save(f'{J}/an/tsd_lane_minus_main.png', np.repeat(np.clip(sd*30+0,0,255)[...,None],3,-1))
