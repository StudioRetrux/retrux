# jmont.py: per pose, MAIN(r11_2) | LANE(qc_final) | REF crops + full-frame diff stats (lane vs MAIN)
import sys, os, numpy as np, OpenImageIO as oiio
SP='/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad'
J=SP+'/work_p4/judge_p4ice3'
M2=SP+'/p3/r11_2'; M1=SP+'/p3/r11_1'; L=SP+'/work_p4/p4ice3/qc_final'; R='/Users/muhamadrifaldi/RetruxR11Work/hp/reference'
poses=[('q00_rest','ref_F000'),('q01_loop15','loop_F015'),('q02_loop30','loop_F030'),('q03_eye','loop_F045'),('p04_expand_pop','ref_F358'),('p05_expand','ref_F402'),('p06_sustain','ref_F420'),('p07_release_snap',None),('p08_release_home',None),('ui_rest',None)]
def rd(p):
    b=oiio.ImageBuf(p); a=b.get_pixels(oiio.FLOAT)[..., :3]; return a
def wr(p,a):
    a=np.clip(a,0,1); spec=oiio.ImageSpec(a.shape[1],a.shape[0],3,oiio.UINT8); o=oiio.ImageOutput.create(p); o.open(p,spec); o.write_image(a.astype(np.float32)); o.close()
os.makedirs(J+'/img',exist_ok=True)
for pose,ref in poses:
    m=rd(f'{M2}/{pose}.png'); l=rd(f'{L}/{pose}.png'); m1=rd(f'{M1}/{pose}.png')
    d=np.abs(l-m).max(-1)*255; d1=np.abs(m1-m).max(-1)*255
    H,W=d.shape
    # stats by region: rows split top / mid / bottom; columns left / mid / right
    def st(dd,y0,y1,x0,x1):
        s=dd[y0:y1,x0:x1]; return f'{(s>8).mean()*100:5.1f}% >8, {(s>32).mean()*100:5.1f}% >32'
    print(pose, 'lane vs MAIN(r11_2):', 'all', st(d,0,H,0,W), '| outside hero box (x<300|x>1140|y>600):', f"{((d>8)&(np.indices(d.shape)[1]<300)).sum()+((d>8)&(np.indices(d.shape)[1]>1140)).sum()+((d>8)&(np.indices(d.shape)[0]>600)&(np.indices(d.shape)[1]>=300)&(np.indices(d.shape)[1]<=1140)).sum()} px >8")
    # diff map image amplified
    dm=np.clip(d/64.0,0,1); img=np.stack([dm,dm*0.3,dm*0.0],-1)*1.0+ (l*0.35)
    wr(f'{J}/img/diff_{pose}.png', img)
    x0,y0,x1,y1=300,30,1140,580
    tiles=[m[y0:y1,x0:x1], np.ones((y1-y0,4,3)), l[y0:y1,x0:x1]]
    if ref:
        r=rd(f'{R}/{ref}.png')
        if r.shape[:2]!=(H,W): print('ref shape',r.shape)
        tiles+= [np.ones((y1-y0,4,3)), r[y0:y1,x0:x1]]
    wr(f'{J}/img/mlr_{pose}.png', np.concatenate(tiles,1))
