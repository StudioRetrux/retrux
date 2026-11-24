import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from jl import *
J='/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4atmos'
R='/Users/muhamadrifaldi/RetruxR11Work/hp/reference'
rows=[]
for n,r in [('rc_07.20','loop_F030'),('rf_00','loop_F045')]:
    f=load(f'{R}/{r}.png'); a=load(f'{J}/caps/main_rest/{n}.png'); b=load(f'{J}/caps/lane_rest/{n}.png')
    rows.append(hst([crop(f,900,360,380,110), crop(a,900,360,380,110), crop(b,900,360,380,110)]))
save(f'{J}/an/berg_L030_L045_ref_main_lane.png', vst([up(r,2) if False else r for r in rows]))
