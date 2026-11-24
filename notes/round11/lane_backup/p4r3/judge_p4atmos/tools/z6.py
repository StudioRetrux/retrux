import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from jl import *
J='/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4atmos'
R='/Users/muhamadrifaldi/RetruxR11Work/hp/reference'
rows=[]
for n in ['rc_03.60','rc_13.20']:
    a=load(f'{J}/caps/main_rest/{n}.png'); b=load(f'{J}/caps/lane_rest/{n}.png')
    rows.append(up(crop(a,960,400,330,80),3)); rows.append(up(crop(b,960,400,330,80),3))
save(f'{J}/an/bergbase3x_main_lane.png', vst(rows))
# row profile across the base at x 1000-1150 (lane vs main) to spot a hard edge
for n in ['rc_03.60','rc_09.20','rc_13.20']:
    a=load(f'{J}/caps/main_rest/{n}.png'); b=load(f'{J}/caps/lane_rest/{n}.png')
    La=luma(a[:,1000:1150]).mean(1); Lb=luma(b[:,1000:1150]).mean(1)
    print(n,'MAIN',' '.join(f'{La[y]:3.0f}' for y in range(400,476,3)))
    print(n,'LANE',' '.join(f'{Lb[y]:3.0f}' for y in range(400,476,3)))
print('rows        ',' '.join(f'{y:3d}' for y in range(400,476,3)))
f=load(f'{R}/ref_F000.png'); Lf=luma(f[:,1000:1150]).mean(1); print('F000 REF    ',' '.join(f'{Lf[y]:3.0f}' for y in range(400,476,3)))
