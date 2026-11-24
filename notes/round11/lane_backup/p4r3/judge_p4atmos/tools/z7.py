import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from jl import *
J='/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4atmos'
R='/Users/muhamadrifaldi/RetruxR11Work/hp/reference'
f=load(f'{R}/ref_F420.png')
rows=[crop(f,0,395,700,230)]
for n in ['e_2.97','e_2.97_t25']:
    for w in ['main','lane']: rows.append(crop(load(f'{J}/caps/{w}_hold/{n}.png'),0,390,700,230))
save(f'{J}/an/p06_bank_det.png', vst(rows))
