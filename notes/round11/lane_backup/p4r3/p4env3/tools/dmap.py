# dmap.py a b out [gain]: |a-b| luma diff map x gain, grey bg = image a at 35 % (where it changed and how much)
import sys
import numpy as np
import OpenImageIO as oiio
def load(p):
    b = oiio.ImageBuf(p); s = b.spec()
    return np.asarray(b.get_pixels(oiio.UINT8)).reshape(s.height, s.width, s.nchannels)[:, :, :3].astype(np.float32)
a, b = load(sys.argv[1]), load(sys.argv[2]); g = float(sys.argv[4]) if len(sys.argv) > 4 else 8
L = lambda x: x @ np.array([0.2126, 0.7152, 0.0722])
d = L(b) - L(a)
o = np.repeat((L(a) * 0.35)[..., None], 3, 2)
o[..., 0] += np.clip(-d * g, 0, 255); o[..., 2] += np.clip(d * g, 0, 255); o[..., 1] += np.clip(np.abs(d) * g * 0.3, 0, 255)
o = np.clip(o, 0, 255).astype(np.uint8); h, w, c = o.shape
out = oiio.ImageOutput.create(sys.argv[3]); out.open(sys.argv[3], oiio.ImageSpec(w, h, c, oiio.UINT8)); out.write_image(o); out.close()
