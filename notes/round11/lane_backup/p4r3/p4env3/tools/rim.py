# J3 rim metric: pixels in a box whose blue-minus-red is under the sky's and the peak's (warm) and whose luma is between them.
#   python -I rim.py x0 x1 y0 y1 imgs...
import sys
import numpy as np
import OpenImageIO as oiio
def load(p):
    b = oiio.ImageBuf(p); s = b.spec()
    return np.asarray(b.get_pixels(oiio.UINT8)).reshape(s.height, s.width, s.nchannels)[:, :, :3].astype(np.float32)
x0, x1, y0, y1 = map(int, sys.argv[1:5])
for p in sys.argv[5:]:
    a = load(p)[y0:y1 + 1, x0:x1 + 1]; L = a @ np.array([0.2126, 0.7152, 0.0722]); br = a[..., 2] - a[..., 0]
    m = (br < 22) & (L > 140) & (L < 205)
    print(f"{p.split('/')[-2]:10s} warm-rim px {int(m.sum()):5d}  min(B-R) {br.min():.0f}  rows with rim: {sorted(set((np.nonzero(m)[0] + y0).tolist()))[:12]}")
