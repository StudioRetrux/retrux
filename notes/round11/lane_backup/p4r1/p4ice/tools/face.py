import sys, numpy as np, OpenImageIO as oiio
sys.path.insert(0, sys.argv[1]); 
def L(p):
    a = oiio.ImageBuf(p).get_pixels(oiio.FLOAT)[..., :3] * 255.0
    return a
def st(a, x0, x1, y0, y1):
    c = a[y0:y1, x0:x1]; l = c @ np.array([0.2126, 0.7152, 0.0722]); m = c.reshape(-1, 3).mean(0)
    q = 4*l[1:-1,1:-1]-l[:-2,1:-1]-l[2:,1:-1]-l[1:-1,:-2]-l[1:-1,2:]
    return f"L{l.mean():5.1f} sd{l.std():4.1f} p5 {np.percentile(l,5):5.1f} B-G{m[2]-m[1]:+5.1f} B-R{m[2]-m[0]:+5.1f} lap{np.abs(q).mean():4.1f}"
for lab, p in [x.split("=", 1) for x in sys.argv[2:]]:
    a = L(p)
    print(f"{lab:5s} face(620-700,365-400) {st(a,620,700,365,400)} | face2(760-830,365-400) {st(a,760,830,365,400)} | q02c(560-880,330-420) {st(a,560,880,330,420)}")
