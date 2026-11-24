import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from jl import *
J='/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4atmos'
R='/Users/muhamadrifaldi/RetruxR11Work/hp/reference'
for n,r in [('rc_03.60','ref_F000'),('rf_00','loop_F045'),('rc_13.20','ref_F297')]:
    f=load(f'{R}/{r}.png'); a=load(f'{J}/caps/main_rest/{n}.png'); b=load(f'{J}/caps/lane_rest/{n}.png')
    for k,(x0,y0,x1,y1) in {'berg_top x1000-1180 y335-365':(1000,335,1180,365),'far_bergs x1240-1440 y380-440':(1240,380,1440,440)}.items():
        print(n,k,'REF',box(f,x0,y0,x1,y1).round(0),'MAIN',box(a,x0,y0,x1,y1).round(0),'LANE',box(b,x0,y0,x1,y1).round(0))
