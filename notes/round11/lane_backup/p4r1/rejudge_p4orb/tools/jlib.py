import numpy as np, OpenImageIO as oiio, sys, os
def load(p):
    b = oiio.ImageBuf(p)
    a = b.get_pixels(oiio.UINT8)
    a = np.asarray(a).reshape(b.spec().height, b.spec().width, b.spec().nchannels)[..., :3]
    return a.astype(np.float32)
def save(p, a):
    a = np.clip(a, 0, 255).astype(np.uint8)
    h, w = a.shape[:2]
    out = oiio.ImageOutput.create(p)
    spec = oiio.ImageSpec(w, h, 3, oiio.UINT8)
    out.open(p, spec); out.write_image(a); out.close()
def crop(a, x, y, w, h):
    return a[y:y+h, x:x+w]
def up(a, k):
    return np.repeat(np.repeat(a, k, axis=0), k, axis=1)
def luma(a):
    return 0.2126*a[...,0] + 0.7152*a[...,1] + 0.0722*a[...,2]
def hstack(ims, gap=4):
    h = max(i.shape[0] for i in ims)
    parts = []
    for k, i in enumerate(ims):
        if i.shape[0] < h:
            i = np.concatenate([i, np.zeros((h - i.shape[0], i.shape[1], 3), np.float32)], 0)
        parts.append(i)
        if k < len(ims) - 1: parts.append(np.full((h, gap, 3), 255, np.float32))
    return np.concatenate(parts, 1)
def vstack(ims, gap=4):
    w = max(i.shape[1] for i in ims)
    parts = []
    for k, i in enumerate(ims):
        if i.shape[1] < w:
            i = np.concatenate([i, np.zeros((i.shape[0], w - i.shape[1], 3), np.float32)], 1)
        parts.append(i)
        if k < len(ims) - 1: parts.append(np.full((gap, w, 3), 255, np.float32))
    return np.concatenate(parts, 0)
