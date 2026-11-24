import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from jl import *
SP='/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad'
R='/Users/muhamadrifaldi/RetruxR11Work/hp/reference'; M2=SP+'/p3/r11_2'; LN=SP+'/work_p4/p4atmos/qc_final'
ref=load(f'{R}/ref_F420.png'); m=load(f'{M2}/p06_sustain.png'); l=load(f'{LN}/p06_sustain.png')
# align on the right side's horizontal structure (iceberg + waterline), x 1000-1400, rows 380-700: row gradient profile
def prof(a,x0,x1): L=luma(a[:,x0:x1]).mean(1); return np.diff(L)
pr=prof(ref,1050,1400); pm=prof(m,1050,1400)
best=None
for off in range(-10,60):
    a=pr[400+off:680+off]; b=pm[400:680]
    c=np.corrcoef(a,b)[0,1]
    if best is None or c>best[1]: best=(off,c)
print('right-side alignment F420 = engine + off:', best)
pr=prof(ref,0,120); pm=prof(m,0,120)
best2=None
for off in range(-10,60):
    a=pr[300+off:620+off]; b=pm[300:620]; c=np.corrcoef(a,b)[0,1]
    if best2 is None or c>best2[1]: best2=(off,c)
print('left ridge alignment:', best2)
off=best[0]
for nm,i,o in [('F420',ref,off),('MAIN',m,0),('LANE',l,0)]:
    L=luma(i[:,120:320]); print(nm.ljust(5),' '.join(f'{L[y+o:y+o+20].mean():4.0f}/{L[y+o:y+o+20].std():2.0f}' for y in range(400,620,20)))
print('rows ',' '.join(f'{y:7d}' for y in range(400,620,20)))
