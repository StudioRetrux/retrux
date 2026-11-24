import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from jl import *
SP='/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad'
R='/Users/muhamadrifaldi/RetruxR11Work/hp/reference'; M2=SP+'/p3/r11_2'; LN=SP+'/work_p4/p4atmos/qc_final'; O=SP+'/work_p4/judge_p4atmos/an'
def boost(c,k=1.8):
    m=c.mean((0,1)); return (c-m)*k+m
ims=[load(f'{R}/ref_F420.png'), load(f'{M2}/p06_sustain.png'), load(f'{LN}/p06_sustain.png')]
cs=[crop(ims[0],0,440,620,200), crop(ims[1],0,420,620,200), crop(ims[2],0,420,620,200)]
save(f'{O}/bank_p06_boost.png', vst([boost(c) for c in cs]))
