import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from jl import *
J='/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4atmos'
R='/Users/muhamadrifaldi/RetruxR11Work/hp/reference'
B={'left_base x0-520 y420-460':(0,420,520,460),'ridge_base x0-120 y380-430':(0,380,120,430),'shore_L x0-200 y438-458':(0,438,200,458),'ridge x0-100 y285-345':(0,285,100,345),'mtn_face x150-560 y250-330':(150,250,560,330),'berg_base x950-1150 y420-455':(950,420,1150,455)}
def st(a,b):
    x0,y0,x1,y1=b; c=a[y0:y1,x0:x1]; m=c.reshape(-1,3).mean(0); s=sat(c).mean(); return f'{m[0]:4.0f},{m[1]:4.0f},{m[2]:4.0f} s{s:.2f} B-R{m[2]-m[0]:3.0f}'
pairs=[('rc_03.60','ref_F000'),('rf_00','loop_F045'),('rc_13.20','ref_F297')]
for n,r in pairs:
    a=load(f'{J}/caps/main_rest/{n}.png'); b=load(f'{J}/caps/lane_rest/{n}.png'); f=load(f'{R}/{r}.png')
    print('==',n,'vs',r)
    for k,bb in B.items(): print(f'  {k:28s} REF {st(f,bb)} | MAIN {st(a,bb)} | LANE {st(b,bb)}')
