import sys
import numpy as np
import OpenImageIO as oiio
def load(p):
    b = oiio.ImageBuf(p); s = b.spec()
    return np.asarray(b.get_pixels(oiio.UINT8)).reshape(s.height, s.width, s.nchannels)[:, :, :3].astype(np.float32)
x0, x1, y0, y1, step = map(int, sys.argv[1:6])
for p in sys.argv[6:]:
    a = load(p); L = a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722
    cols = L[y0:y1 + 1, x0:x1 + 1].mean(0)
    print(f"{p.split('/')[-2]:8s}", ' '.join(f"{v:.0f}" for v in cols[::step]))
