import sys, numpy as np, OpenImageIO as oiio
D=sys.argv[1]; seq=sys.argv[2]; out=sys.argv[3]
def load(p):
    a=oiio.ImageBuf(p).get_pixels(oiio.FLOAT)[..., :3]*255.0
    return a @ np.array([0.2126,0.7152,0.0722])
maps=[]
for name in ('main','lane'):
    S=[load(f'{D}/{name}/{seq}_{i:02d}.png') for i in range(10)]
    d2=np.mean([np.abs(S[t+1]-2*S[t]+S[t-1]) for t in range(1,9)],0)
    maps.append(d2)
img=np.concatenate([maps[0], np.full((maps[0].shape[0],4),60.0), maps[1]],1)
img=np.clip(img/40.0,0,1)
rgb=np.stack([img,img,img],-1).astype(np.float32)
b=oiio.ImageBuf(oiio.ImageSpec(rgb.shape[1],rgb.shape[0],3,oiio.FLOAT)); b.set_pixels(oiio.ROI(),rgb); b.write(out)
