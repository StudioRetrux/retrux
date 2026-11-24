import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from jl import *
J='/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4atmos'
R='/Users/muhamadrifaldi/RetruxR11Work/hp/reference'
for n,r in [('rc_03.60','ref_F000'),('rf_00','loop_F045'),('rc_13.20','ref_F297'),('rc_07.20','loop_F030')]:
    a=load(f'{J}/caps/main_rest/{n}.png'); b=load(f'{J}/caps/lane_rest/{n}.png'); f=load(f'{R}/{r}.png')
    for k,(x0,y0,x1,y1) in {'mtn_face':(150,250,560,330),'mtn_stripe':(220,250,460,300),'berg_base':(950,420,1150,455)}.items():
        print(f'{n} {k:10s} lap REF {lap(f[y0:y1,x0:x1]):.2f} MAIN {lap(a[y0:y1,x0:x1]):.2f} LANE {lap(b[y0:y1,x0:x1]):.2f} | L REF {luma(f[y0:y1,x0:x1]).mean():.0f} MAIN {luma(a[y0:y1,x0:x1]).mean():.0f} LANE {luma(b[y0:y1,x0:x1]).mean():.0f}')
