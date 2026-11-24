# rejudge_wl2: rest frame MAIN vs wl2: full-frame |diff| stats and a diff map (x8), plus where it differs
import sys, json, zlib, numpy as np
sys.path.insert(0, sys.argv[1]); from imgio import save
def fr(d, i=2):
    M=json.load(open(d+"/meta.json")); W=M["W"]; R=M["y1"]-M["y0"]
    return np.frombuffer(zlib.decompress(open(d+"/f%04d.bin"%i,"rb").read()),np.uint8).reshape(R,W,4)[::-1][...,:3].astype(np.float32)
a=fr(sys.argv[2]); b=fr(sys.argv[3]); d=np.abs(a-b).max(-1)
print(sys.argv[2].split('/')[-1], sys.argv[3].split('/')[-1], "shape", a.shape, "px>2: %d  px>8: %d  max %d  mean %.3f" % ((d>2).sum(), (d>8).sum(), d.max(), d.mean()))
ys,xs=np.nonzero(d>2)
if len(ys): print("  diff bbox x %d-%d y %d-%d; rows<430 (above water) px>2: %d" % (xs.min(), xs.max(), ys.min(), ys.max(), (d[:430]>2).sum()))
save(sys.argv[4], np.clip(d*8,0,255).astype(np.uint8)[...,None].repeat(3,-1))
