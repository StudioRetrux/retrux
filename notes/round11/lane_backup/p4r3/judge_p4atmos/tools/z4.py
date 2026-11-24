import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from jl import *
SP='/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad'
R='/Users/muhamadrifaldi/RetruxR11Work/hp/reference'; M2=SP+'/p3/r11_2'; LN=SP+'/work_p4/p4atmos/qc_final'; O=SP+'/work_p4/judge_p4atmos/an'
def boost(c,k=2.5):
    m=c.mean((0,1)); return (c-m)*k+m
ims=[load(f'{R}/ref_F000.png'), load(f'{M2}/q00_rest.png'), load(f'{LN}/q00_rest.png')]
save(f'{O}/rightboost_q00.png', vst([boost(crop(i,840,360,600,130)) for i in ims]))
