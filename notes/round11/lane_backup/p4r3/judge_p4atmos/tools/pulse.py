import sys, os, glob; sys.path.insert(0, os.path.dirname(__file__)); from jl import *
J='/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4atmos'
REG={'berg_base':(950,420,1150,455),'berg_right':(1150,400,1240,440),'under_berg':(950,456,1200,480),'far_right':(1240,380,1440,445),'left_base':(0,420,520,460),'ridge':(0,285,100,345),'mtn_face':(150,250,560,330),'mtn_upper':(250,200,450,260)}
which=sys.argv[1:] or ['lane','main']
for w in which:
    for seq,pat in [('fine','rf_*.png'),('coarse','rc_*.png')]:
        fs=sorted(glob.glob(f'{J}/caps/{w}_rest/{pat}'))
        if not fs: continue
        ims=[load(f) for f in fs]
        print(f'== {w} {seq} ({len(fs)} frames)')
        for k,(x0,y0,x1,y1) in REG.items():
            m=[luma(i[y0:y1,x0:x1]).mean() for i in ims]
            d=[np.abs(luma(ims[i+1][y0:y1,x0:x1])-luma(ims[i][y0:y1,x0:x1])).mean() for i in range(len(ims)-1)]
            dm=np.diff(m); acc=np.abs(np.diff(dm)) if len(dm)>1 else np.zeros(1)
            print(f'  {k:11s} mean {min(m):6.1f}..{max(m):6.1f}  step|dmean| max {np.abs(dm).max():5.2f}  2nd-diff max {acc.max():5.2f}  pix|dI| mean {np.mean(d):5.2f} max {np.max(d):5.2f}')
