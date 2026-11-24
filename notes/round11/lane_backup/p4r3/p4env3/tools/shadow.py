# shadow.py x0 x1 y0 y1 imgs... : luma mean / p1 / p10 / p50, B-R p99, px with B-R>85 (blue-violet blotch), px luma<50 (slits)
import sys
import numpy as np
import OpenImageIO as oiio
def load(p):
    b = oiio.ImageBuf(p); s = b.spec()
    return np.asarray(b.get_pixels(oiio.UINT8)).reshape(s.height, s.width, s.nchannels)[:, :, :3].astype(np.float32)
x0, x1, y0, y1 = map(int, sys.argv[1:5])
for p in sys.argv[5:]:
    a = load(p)[y0:y1 + 1, x0:x1 + 1]; L = a @ np.array([0.2126, 0.7152, 0.0722]); br = a[..., 2] - a[..., 0]
    print(f"{'/'.join(p.split('/')[-2:]):28s} L {L.mean():6.1f} p1 {np.percentile(L,1):5.1f} p10 {np.percentile(L,10):5.1f} p50 {np.percentile(L,50):5.1f} sd {L.std():5.2f} | B-R mean {br.mean():5.1f} p99 {np.percentile(br,99):5.1f} n(B-R>85) {int((br>85).sum()):5d} | n(L<50) {int((L<50).sum())}")
