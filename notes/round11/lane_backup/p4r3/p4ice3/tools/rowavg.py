# rowavg.py y0 y1 x0 x1 step img...  : luma averaged over rows y0..y1, printed every `step` px from x0 to x1
import sys, numpy as np, OpenImageIO as oiio
y0,y1,x0,x1,st=map(int,sys.argv[1:6])
for p in sys.argv[6:]:
    a=oiio.ImageBuf(p).get_pixels(oiio.FLOAT)[..., :3]*255.0
    l=(a@np.array([0.2126,0.7152,0.0722]))[y0:y1, x0:x1].mean(0)
    bg=(a[y0:y1,x0:x1,2]-a[y0:y1,x0:x1,1]).mean(0)
    print(f"{p.split('/')[-3][:8]:8s}", ' '.join(f'{v:3.0f}' for v in l[::st]))
    print(f"{'  B-G':8s}", ' '.join(f'{v:3.0f}' for v in bg[::st]))
