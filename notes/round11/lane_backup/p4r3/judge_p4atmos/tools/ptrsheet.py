import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from jl import *
SP='/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad'
M2=SP+'/p3/r11_2'; LN=SP+'/work_p4/p4atmos/qc_final'; O=SP+'/work_p4/judge_p4atmos/an'
rows=[]
for s in ['ptr_right','ptr_left','ptr_top_right','ptr_bottom_left','ptr_bottom_right']:
    a=load(f'{M2}/ptr/{s}.png'); b=load(f'{LN}/ptr/{s}.png')
    # environment band only: y 220-520
    rows.append(hst([half(crop(a,0,200,1440,320)), half(crop(b,0,200,1440,320))]))
save(f'{O}/ptr_env_main_lane.png', vst(rows))
