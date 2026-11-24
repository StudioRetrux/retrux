import sys, os, glob; sys.path.insert(0, os.path.dirname(__file__)); from jl import *
J='/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4atmos'
S={}; RGB={}
for w in ['main','lane']:
    fs=sorted(glob.glob(f'{J}/caps/{w}_hold/hs_*.png')); RGB[w]=[load(f) for f in fs]; S[w]=np.stack([luma(i) for i in RGB[w]])
for nm,(x0,y0,x1,y1) in {'patchL x250-520 y450-590':(250,450,520,590),'patchR x760-1060 y480-600':(760,480,1060,600)}.items():
    for w in ['main','lane']:
        c=S[w][:,y0:y1,x0:x1]; d=np.abs(np.diff(c,axis=0)).mean((1,2)); tot=np.abs(c[-1]-c[0]).mean(); m=c.mean((1,2))
        print(f'{w} {nm}: consecutive pix|dI| mean {d.mean():.2f} max {d.max():.2f}; |I(t+0.67s)-I(t)| {tot:.2f}; region mean {m[0]:.1f} -> {m[-1]:.1f}; per-frame means', ' '.join(f'{v:.1f}' for v in m[::4]))
# visual: first / middle / last frame crops, MAIN row then LANE row
rows=[]
for w in ['main','lane']:
    rows.append(hst([crop(RGB[w][k],200,420,420,200) for k in [0,10,20]]))
save(f'{J}/an/sustain_seq_left.png', vst(rows))
rows=[]
for w in ['main','lane']:
    rows.append(hst([crop(RGB[w][k],700,440,560,180) for k in [0,10,20]]))
save(f'{J}/an/sustain_seq_right.png', vst(rows))
