import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from jl import *
SP='/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad'
M1=SP+'/p3/r11_1'; LN=SP+'/work_p4/p4atmos/qc_final'; O=SP+'/work_p4/judge_p4atmos/an'
rows=[]
for n in ['p05_expand','p06_sustain']:
    rows.append(hst([crop(load(f'{M1}/{n}.png'),0,560,1440,206)[:, ::2][:, :720], crop(load(f'{LN}/{n}.png'),0,560,1440,206)[:, ::2][:, :720]]))
save(f'{O}/bottom_r11_1_vs_lane.png', vst(rows))
rows=[hst([half(load(f'{M1}/sweep/sw_hold_T.png')), half(load(f'{LN}/sweep/sw_hold_T.png'))])]
save(f'{O}/holdT_r11_1_vs_lane.png', vst(rows))
