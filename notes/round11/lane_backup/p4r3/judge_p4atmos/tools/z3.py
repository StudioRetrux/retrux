import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from jl import *
SP='/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad'
R='/Users/muhamadrifaldi/RetruxR11Work/hp/reference'; M1=SP+'/p3/r11_1'; M2=SP+'/p3/r11_2'; LN=SP+'/work_p4/p4atmos/qc_final'; O=SP+'/work_p4/judge_p4atmos/an'
for pose,ref,yoff in [('p06_sustain','ref_F420',40),('p05_expand','ref_F402',40),('p04_expand_pop','ref_F358',0),('p07_release_snap','ref_F453',0),('p08_release_home','ref_F460',0)]:
    ims=[load(f'{R}/{ref}.png'), load(f'{M2}/{pose}.png'), load(f'{LN}/{pose}.png')]
    # the reference hold frames sit ~15-25 px lower (panel note): show the ref crop offset by yoff
    cs=[crop(ims[0],0,280+yoff,560,330), crop(ims[1],0,280,560,330), crop(ims[2],0,280,560,330)]
    save(f'{O}/leftbank_{pose}.png', hst(cs))
    cr=[crop(ims[0],880,300+yoff,560,300), crop(ims[1],880,300,560,300), crop(ims[2],880,300,560,300)]
    save(f'{O}/rightbank_{pose}.png', hst(cr))
    for nm,i,yo in zip(['REF','MAIN','LANE'],ims,[yoff,0,0]):
        L=luma(i[:,120:320]); print(pose, nm.ljust(4),'rows',' '.join(f'{L[y+yo:y+yo+20].mean():4.0f}/{L[y+yo:y+yo+20].std():3.0f}' for y in range(420,620,20)))
    print(pose,'left patch x0-200 y300-380:', [box(i,0,300+yo,200,380+yo).round(0).tolist() for i,yo in zip(ims,[0,0,0])])
