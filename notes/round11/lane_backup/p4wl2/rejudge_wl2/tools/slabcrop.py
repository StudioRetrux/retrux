# REF | lane | MAIN crops of the far slabs (x 880-1440, y 440-590) at 1x and 2x (+ left slabs x 0-560 y 440-590)
import sys, json, zlib, numpy as np
sys.path.insert(0, sys.argv[1]); from imgio import load, save
def fr(d, i=2):
    M=json.load(open(d+"/meta.json")); W=M["W"]; R=M["y1"]-M["y0"]
    return np.frombuffer(zlib.decompress(open(d+"/f%04d.bin"%i,"rb").read()),np.uint8).reshape(R,W,4)[::-1][...,:3]
ref=load('/Users/muhamadrifaldi/RetruxR11Work/hp/reference/ref_F000.png')[...,:3]; ref=(ref*255 if ref.max()<=1.5 else ref).astype(np.uint8)
lane=fr(sys.argv[2]); main=fr(sys.argv[3]); out=sys.argv[4]
for name,(x0,x1) in (("far",(880,1440)),("left",(0,560))):
    y0,y1=440,590
    c=[a[y0:y1,x0:x1] for a in (ref,lane,main)]
    sep=np.full((4,x1-x0,3),255,np.uint8)
    save(out+"_%s_1x.png"%name, np.concatenate([c[0],sep,c[1],sep,c[2]],0))
    z=[a[y0:y0+75,x0+(x1-x0)//4:x0+(x1-x0)//4+280].repeat(2,0).repeat(2,1) for a in (ref,lane,main)]
    sep=np.full((6,560,3),255,np.uint8)
    save(out+"_%s_2x.png"%name, np.concatenate([z[0],sep,z[1],sep,z[2]],0))
