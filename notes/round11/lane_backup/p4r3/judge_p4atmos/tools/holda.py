import sys, os, glob; sys.path.insert(0, os.path.dirname(__file__)); from jl import *
J='/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4atmos'
R='/Users/muhamadrifaldi/RetruxR11Work/hp/reference'
L=lambda w,n: load(f'{J}/caps/{w}_hold/{n}.png')
f420=load(f'{R}/ref_F420.png')
# 1. sustain bank rows vs F420 (F420 = engine + 5 px), x 120-320
for n in ['e_2.97','e_2.97_t25','e_2.50']:
    print('==',n)
    for nm,i,o in [('F420',f420,5),('MAIN',L('main',n),0),('LANE',L('lane',n),0)]:
        Lm=luma(i[:,120:320]); print('  ',nm.ljust(5),' '.join(f'{Lm[y+o:y+o+20].mean():4.0f}/{Lm[y+o:y+o+20].std():2.0f}' for y in range(400,620,20)))
    a=[luma(L(w,n)[:,120:320]) for w in ['main','lane']]; r=luma(f420[:,120:320])
    for nm,x in zip(['MAIN','LANE'],a):
        dd=[abs(x[y:y+20].mean()-r[y+5:y+25].mean()) for y in range(440,600,20)]
        print(f'   {nm} mean|d| vs F420 rows 440-600: {np.mean(dd):.1f}')
print('rows      ',' '.join(f'{y:7d}' for y in range(400,620,20)))
# 2. release: left patch x0-200 y300-380 per time (monotonic?)
for w in ['main','lane']:
    fs=sorted(glob.glob(f'{J}/caps/{w}_hold/r_*.png'))
    print(w,'release left patch L:',' '.join(f'{os.path.basename(f)[2:6]}:{luma(load(f)[300:380,0:200]).mean():.0f}' for f in fs))
# 3. sustain consecutive frames: flicker in the bank region x0-600 y430-620
for w in ['main','lane']:
    fs=sorted(glob.glob(f'{J}/caps/{w}_hold/hs_*.png')); ims=[luma(load(f)[430:620,0:600]) for f in fs]
    d=[np.abs(ims[i+1]-ims[i]).mean() for i in range(len(ims)-1)]; m=[x.mean() for x in ims]; dm=np.diff(m)
    print(w,'sustain bank: pix|dI| mean %.2f max %.2f; region mean %.1f..%.1f; step max %.2f; 2nd-diff max %.2f'%(np.mean(d),np.max(d),min(m),max(m),np.abs(dm).max(),np.abs(np.diff(dm)).max()))
