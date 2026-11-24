# MAIN | lane side by side from two cap.mjs sequences (same stepped poses): PNG sequence + strip
import sys, json, zlib, os, numpy as np
sys.path.insert(0, sys.argv[1]); from imgio import save
def seq(d, box):
    M=json.load(open(d+"/meta.json")); W=M["W"]; R=M["y1"]-M["y0"]; N=len(M["info"]); k=W/M["vw"]
    x0,y0,x1,y1=[int(round(v*k)) for v in box]; y0-=M["y0"]; y1-=M["y0"]
    return [np.frombuffer(zlib.decompress(open(d+"/f%04d.bin"%i,"rb").read()),np.uint8).reshape(R,W,4)[::-1][y0:y1,x0:x1,:3] for i in range(N)]
box=[float(v) for v in sys.argv[4:8]]; a=seq(sys.argv[2],box); b=seq(sys.argv[3],box); out=sys.argv[8]; s=int(sys.argv[9])
os.makedirs(out,exist_ok=True)
for i in range(min(len(a),len(b))):
    f=np.concatenate([a[i].repeat(s,0).repeat(s,1),np.full((a[i].shape[0]*s,8,3),255,np.uint8),b[i].repeat(s,0).repeat(s,1)],1)
    h,w=f.shape[:2]; f=f[:h-h%2,:w-w%2]
    save(out+"/f%04d.png"%i,f)
