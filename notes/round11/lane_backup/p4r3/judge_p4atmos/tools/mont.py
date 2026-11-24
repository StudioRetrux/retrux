import sys, os, glob; sys.path.insert(0, os.path.dirname(__file__)); from jl import *
J='/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4atmos'
w=sys.argv[1]; x,y,cw,ch=[int(v) for v in sys.argv[2:6]]; pat=sys.argv[6]; step=int(sys.argv[7]); out=sys.argv[8]; cols=int(sys.argv[9]) if len(sys.argv)>9 else 4
fs=sorted(glob.glob(f'{J}/caps/{w}/{pat}'))[::step]
cs=[crop(load(f),x,y,cw,ch) for f in fs]
rows=[hst(cs[i:i+cols]) for i in range(0,len(cs),cols)]
save(f'{J}/an/{out}', vst(rows)); print(len(cs),'tiles', [os.path.basename(f) for f in fs])
