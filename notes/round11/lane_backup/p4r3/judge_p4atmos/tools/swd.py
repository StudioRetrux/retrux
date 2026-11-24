import sys, os, glob; sys.path.insert(0, os.path.dirname(__file__)); from jl import *
SP='/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad'
M2=SP+'/p3/r11_2'; LN=SP+'/work_p4/p4atmos/qc_final'
for sub in ['sweep','ptr']:
    for f in sorted(glob.glob(f'{LN}/{sub}/*.png')):
        n=os.path.basename(f); m=f'{M2}/{sub}/{n}'
        if not os.path.exists(m): continue
        a=load(m); b=load(f); d=np.abs(a-b).max(-1)
        # fraction of pixels changed > 2, and in the ring area (center) vs the env
        tot=(d>2).mean(); cen=(d[150:620,450:990]>2).mean()
        print(f'{sub}/{n:28s} changed>2 {tot*100:5.1f}%  centre {cen*100:5.1f}%  max {d.max():.0f}')
