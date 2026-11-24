import sys, json; sys.path.insert(0, sys.argv[1])
from jlib import *
import numpy as np
BOX = {
 "berg_base":  (950, 420, 1150, 455),
 "berg_foot":  (1060, 400, 1240, 440),
 "berg_mid":   (1020, 380, 1140, 410),
 "berg_top":   (950, 330, 1200, 370),
 "far_bergs":  (1240, 390, 1440, 450),
 "far_rangeR": (1240, 360, 1340, 390),
 "mound":      (1300, 400, 1440, 470),
 "left_base":  (1, 420, 520, 460),
 "left_hzn":   (1, 360, 520, 440),
 "mtn_face":   (250, 285, 370, 360),
 "mtn_upper":  (170, 260, 370, 330),
 "mtn_foot":   (330, 380, 450, 420),
 "ridge":      (1, 285, 100, 345),
 "ridge_base": (1, 380, 120, 430),
 "shore_L":    (1, 438, 200, 458),
}
def lap(L):
    return np.abs(4*L[1:-1,1:-1]-L[:-2,1:-1]-L[2:,1:-1]-L[1:-1,:-2]-L[1:-1,2:]).mean()
def stats(a, b):
    x0,y0,x1,y1 = b
    c = a[y0:y1, x0:x1]; L = luma(c)
    m = c.reshape(-1,3).mean(0)
    mx=c.max(-1); mn=c.min(-1); sat=((mx-mn)/np.maximum(mx,1)).mean()
    return dict(rgb=[round(float(v),1) for v in m], L=round(float(L.mean()),1), p10=round(float(np.percentile(L,10)),1), p90=round(float(np.percentile(L,90)),1), lap=round(float(lap(L)),2), sat=round(float(sat),3))
if __name__ == "__main__":
    # usage: boxes.py toolsdir img [img2 ...] -> per box table
    imgs = sys.argv[2:]
    A = [load(p) for p in imgs]
    names = [p.split('/')[-1].replace('.png','') for p in imgs]
    for k, b in BOX.items():
        row = [k]
        for a in A:
            s = stats(a, b)
            row.append(f"{s['rgb'][0]:.0f},{s['rgb'][1]:.0f},{s['rgb'][2]:.0f} L{s['L']:.0f} [{s['p10']:.0f}-{s['p90']:.0f}] lap{s['lap']:.1f} s{s['sat']:.2f}")
        print(" | ".join(row))
    print("cols:", " | ".join(names))
