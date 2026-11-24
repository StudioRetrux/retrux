# temporal pops vs a 4x-sample GT of the same build (same stepped poses):
#   python3 -I gtpop.py TOOLS SEQ GT2X x0 y0 x1 y1(CSS) [thr]
# GT2X: the same path captured at 2x the buffer size (cap.mjs --vw 2x --vh 2x), 2x2-averaged here. A pop = a pixel whose
# frame-to-frame change differs from the GT's change by > thr levels (luma). Also: one-frame blips in SEQ and in the GT.
import sys, json, zlib, numpy as np
sys.path.insert(0, sys.argv[1])
def load(d, box):
    M=json.load(open(d+"/meta.json")); W=M["W"]; R=M["y1"]-M["y0"]; N=len(M["info"]); k=W/M["vw"]
    x0,y0,x1,y1=[int(round(v*k)) for v in box]; y0-=M["y0"]; y1-=M["y0"]
    F=np.array([np.frombuffer(zlib.decompress(open(d+"/f%04d.bin"%i,"rb").read()),np.uint8).reshape(R,W,4)[::-1][y0:y1,x0:x1,:3] for i in range(N)]).astype(np.float32)
    return F@np.array([.2126,.7152,.0722],np.float32), M
box=[float(v) for v in sys.argv[4:8]]; thr=float(sys.argv[8]) if len(sys.argv)>8 else 12
S,MS=load(sys.argv[2],box); G,MG=load(sys.argv[3],[v*2 for v in box])
G=G[:,:G.shape[1]//2*2,:G.shape[2]//2*2]; G=G.reshape(G.shape[0],G.shape[1]//2,2,G.shape[2]//2,2).mean((2,4)); n=min(len(S),len(G)); h=min(S.shape[1],G.shape[1]); w=min(S.shape[2],G.shape[2])
S=S[:n,:h,:w]; G=G[:n,:h,:w]
dS=np.diff(S,axis=0); dG=np.diff(G,axis=0); pop=np.abs(dS-dG)>thr
def blips(L):
    d=np.diff(L,axis=0); return ((np.abs(d[:-1])>thr)&(np.abs(d[1:])>thr)&(np.sign(d[:-1])!=np.sign(d[1:]))).reshape(len(L)-2,-1).sum(1)
bS=blips(S); bG=blips(G)
print("%-28s pops vs GT/frame %.1f (p90 %.0f) | blips seq %.1f GT %.1f excess %.1f | |S-G| mean %.2f" % (sys.argv[2].split('/')[-1], pop.reshape(n-1,-1).sum(1).mean(), np.percentile(pop.reshape(n-1,-1).sum(1),90), bS.mean(), bG.mean(), bS.mean()-bG.mean(), np.abs(S-G).mean()))
