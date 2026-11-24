import numpy as np, OpenImageIO as oiio
def load(p):
    b = oiio.ImageBuf(p)
    a = b.get_pixels(oiio.FLOAT)  # 0..1
    a = np.asarray(a)
    if a.ndim == 2: a = a[:, :, None]
    return a[:, :, :3] * 255.0
def save(p, a):
    a = np.clip(a, 0, 255).astype(np.uint8)
    h, w = a.shape[:2]
    spec = oiio.ImageSpec(w, h, a.shape[2] if a.ndim == 3 else 1, oiio.UINT8)
    o = oiio.ImageOutput.create(p)
    o.open(p, spec)
    o.write_image(a)
    o.close()
def luma(a):
    return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722
def resize(a, w, h):
    b = oiio.ImageBuf(oiio.ImageSpec(a.shape[1], a.shape[0], a.shape[2], oiio.FLOAT))
    b.set_pixels(oiio.ROI(0, a.shape[1], 0, a.shape[0], 0, 1, 0, a.shape[2]), (a / 255.0).astype(np.float32))
    r = oiio.ImageBufAlgo.resize(b, roi=oiio.ROI(0, w, 0, h, 0, 1, 0, a.shape[2]))
    return np.asarray(r.get_pixels(oiio.FLOAT)) * 255.0
