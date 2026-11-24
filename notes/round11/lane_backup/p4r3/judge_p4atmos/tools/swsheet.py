import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from jl import *
SP='/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad'
M2=SP+'/p3/r11_2'; LN=SP+'/work_p4/p4atmos/qc_final'; O=SP+'/work_p4/judge_p4atmos/an'
def third(a):
    h,w=a.shape[0]//3*3,a.shape[1]//3*3; a=a[:h,:w]; return a.reshape(h//3,3,w//3,3,3).mean((1,3))
for ph in ['hold','pop','rel']:
    rows=[]
    for d in ['L','R','T','B','BL','TR']:
        rows.append(hst([third(load(f'{M2}/sweep/sw_{ph}_{d}.png')), third(load(f'{LN}/sweep/sw_{ph}_{d}.png'))]))
    save(f'{O}/sweep_{ph}_main_lane.png', vst(rows))
print('ok')
