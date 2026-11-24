import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from jl import *
J='/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4atmos'
sub=sys.argv[1]; names=sys.argv[2:]
for n in names:
    a=load(f'{J}/caps/main_{sub}/{n}.png'); b=load(f'{J}/caps/lane_{sub}/{n}.png')
    d=luma(b)-luma(a)
    # signed map: red = lane brighter, blue = lane darker, x8
    s=np.zeros_like(a); s[...,0]=np.clip(d*8,0,255); s[...,2]=np.clip(-d*8,0,255); s[...,1]=np.clip(np.abs(d)*3,0,255)*0
    ch=np.abs(b-a).max(-1)>1
    ys,xs=np.nonzero(ch)
    print(f'{n}: changed>1 {ch.mean()*100:.2f}% of frame; bbox x {xs.min() if len(xs) else -1}-{xs.max() if len(xs) else -1} y {ys.min() if len(ys) else -1}-{ys.max() if len(ys) else -1}; dL min {d.min():.0f} max {d.max():.0f}')
    save(f'{J}/an/dmap_{sub}_{n}.png', vst([hst([half(a),half(b)]), hst([half(s), half(np.repeat(np.clip(np.abs(d)*8,0,255)[...,None],3,-1))])]))
