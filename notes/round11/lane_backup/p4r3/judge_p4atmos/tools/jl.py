import numpy as np, OpenImageIO as oiio, os
def load(p):
    b = oiio.ImageBuf(p); a = b.get_pixels(oiio.UINT8)
    s = b.spec(); a = np.asarray(a).reshape(s.height, s.width, s.nchannels)[..., :3]
    return a.astype(np.float32)
def save(p, a):
    a = np.clip(a, 0, 255).astype(np.uint8); h, w = a.shape[:2]
    o = oiio.ImageOutput.create(p); o.open(p, oiio.ImageSpec(w, h, 3, oiio.UINT8)); o.write_image(a); o.close()
def crop(a, x, y, w, h): return a[y:y+h, x:x+w]
def up(a, k): return np.repeat(np.repeat(a, k, axis=0), k, axis=1)
def half(a):
    h, w = a.shape[0]//2*2, a.shape[1]//2*2; a = a[:h, :w]
    return (a[0::2,0::2]+a[1::2,0::2]+a[0::2,1::2]+a[1::2,1::2])/4
def luma(a): return 0.2126*a[...,0]+0.7152*a[...,1]+0.0722*a[...,2]
def sat(a):
    mx = a.max(-1); mn = a.min(-1); return np.where(mx > 0, (mx-mn)/np.maximum(mx,1e-6), 0)
def hst(ims, gap=4):
    h = max(i.shape[0] for i in ims); parts = []
    for k, i in enumerate(ims):
        if i.shape[0] < h: i = np.concatenate([i, np.zeros((h-i.shape[0], i.shape[1], 3), np.float32)], 0)
        parts.append(i)
        if k < len(ims)-1: parts.append(np.full((h, gap, 3), 255, np.float32))
    return np.concatenate(parts, 1)
def vst(ims, gap=4):
    w = max(i.shape[1] for i in ims); parts = []
    for k, i in enumerate(ims):
        if i.shape[1] < w: i = np.concatenate([i, np.zeros((i.shape[0], w-i.shape[1], 3), np.float32)], 1)
        parts.append(i)
        if k < len(ims)-1: parts.append(np.full((gap, w, 3), 255, np.float32))
    return np.concatenate(parts, 0)
def box(a, x0, y0, x1, y1):
    c = a[y0:y1, x0:x1]; return c.reshape(-1,3).mean(0)
def lap(a):
    L = luma(a); return np.abs(4*L[1:-1,1:-1]-L[:-2,1:-1]-L[2:,1:-1]-L[1:-1,:-2]-L[1:-1,2:]).mean()
def diffmap(a, b, k=6):
    d = np.abs(a-b).max(-1)*k; return np.repeat(np.clip(d,0,255)[...,None],3,-1)
