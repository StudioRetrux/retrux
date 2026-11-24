import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from jl import *
SP='/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad'
R='/Users/muhamadrifaldi/RetruxR11Work/hp/reference'; M1=SP+'/p3/r11_1'; M2=SP+'/p3/r11_2'; LN=SP+'/work_p4/p4atmos/qc_final'; O=SP+'/work_p4/judge_p4atmos/an'
pose=sys.argv[1] if len(sys.argv)>1 else 'q00_rest'; ref=sys.argv[2] if len(sys.argv)>2 else 'ref_F000'
ims=[load(f'{R}/{ref}.png'), load(f'{M2}/{pose}.png'), load(f'{LN}/{pose}.png')]
def boost(c):
    m=c.mean((0,1)); return (c-m)*2.2+m
save(f'{O}/mtnboost_{pose}.png', hst([boost(crop(i,150,190,420,270)) for i in ims]))
# row profile of the face: x 260-440 (left of the hero), luma per 6-row band
for name,i in zip(['REF','MAIN','LANE'],ims):
    L=luma(i[:, 260:440]); print(name.ljust(5),' '.join(f'{L[y:y+6].mean():5.0f}' for y in range(200,460,6)))
print('rows ',' '.join(f'{y:5d}' for y in range(200,460,6)))
