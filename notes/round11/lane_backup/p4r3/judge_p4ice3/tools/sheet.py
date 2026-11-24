# sheet.py out.png x0 y0 x1 y1 down dirA dirB name1 name2 ... : row A, row B (box-downscaled crops)
import sys, numpy as np, OpenImageIO as oiio
out=sys.argv[1]; x0,y0,x1,y1,dn=map(int,sys.argv[2:7]); A,B=sys.argv[7:9]; names=sys.argv[9:]
def rd(p):
    a=oiio.ImageBuf(p).get_pixels(oiio.FLOAT)[..., :3][y0:y1,x0:x1]
    h,w=a.shape[0]//dn*dn, a.shape[1]//dn*dn; a=a[:h,:w]
    return a.reshape(h//dn,dn,w//dn,dn,3).mean((1,3))
rows=[]
for D in (A,B):
    t=[]
    for n in names: t+= [rd(f'{D}/{n}'), np.ones(((y1-y0)//dn,3,3))]
    rows.append(np.concatenate(t[:-1],1)); rows.append(np.ones((3,rows[-1].shape[1],3)))
m=np.concatenate(rows[:-1],0)
o=oiio.ImageOutput.create(out); o.open(out,oiio.ImageSpec(m.shape[1],m.shape[0],3,oiio.UINT8)); o.write_image(np.clip(m,0,1).astype(np.float32)); o.close(); print(out,m.shape)
