import json, zlib, numpy as np
def fr(d, i=2):
    M=json.load(open(d+"/meta.json")); W=M["W"]; R=M["y1"]-M["y0"]
    return np.frombuffer(zlib.decompress(open(d+"/f%04d.bin"%i,"rb").read()),np.uint8).reshape(R,W,4)[::-1][...,:3]
def ref():
    from imgio import load
    a=load('/Users/muhamadrifaldi/RetruxR11Work/hp/reference/ref_F000.png')[...,:3]
    return a.astype(np.uint8)
def luma(a): return (a[...,0]*0.2126+a[...,1]*0.7152+a[...,2]*0.0722).astype(np.float32)
