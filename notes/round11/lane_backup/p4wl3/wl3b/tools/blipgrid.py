# blip counts per 40x30 CSS cell (stepped), B vs L. args TOOLS STDIR dirB dirL x0 y0 x1 y1
import sys, json, zlib, os, numpy as np
D=sys.argv[2]; a,b=sys.argv[3:5]; X0,Y0,X1,Y1=map(int,sys.argv[5:9])
LU=np.array([0.2126,0.7152,0.0722],np.float32)
def bm(d):
    m=json.load(open(os.path.join(D,d,"meta.json"))); Wd=m["W"]; H=m["y1"]-m["y0"]; n=len(m["info"])
    A=np.array([np.frombuffer(zlib.decompress(open(os.path.join(D,d,"f%04d.bin"%k),"rb").read()),np.uint8).reshape(H,Wd,4)[::-1,:,:3] for k in range(n)]).astype(np.float32)@LU
    dd=np.diff(A,axis=0); bl=(np.abs(dd[:-1])>12)&(np.abs(dd[1:])>12)&(np.sign(dd[:-1])!=np.sign(dd[1:])); return bl.sum(0)/bl.shape[0], m
A,m=bm(a); B,_=bm(b); k=m["W"]/1440
print("cells: rows y, cols x; value = L - B blips/frame (B in parens)")
for y in range(Y0,Y1,30):
    r=[]
    for x in range(X0,X1,40):
        sl=(slice(int(y*k-m["y0"]),int((y+30)*k-m["y0"])),slice(int(x*k),int((x+40)*k)))
        r.append("%+5.0f(%4.0f)"%(B[sl].sum()-A[sl].sum(),A[sl].sum()))
    print("y%3d "%y+" ".join(r))
