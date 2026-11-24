# verify_int1 image helpers (Blender python -I: numpy + OpenImageIO)
import numpy as np, OpenImageIO as oiio
def load(p):
    b = oiio.ImageBuf(p); s = b.spec(); a = np.asarray(b.get_pixels(oiio.UINT8)).reshape(s.height, s.width, s.nchannels)
    return a[..., :3].astype(np.float32)
def save(p, a):
    a = np.clip(a, 0, 255).astype(np.uint8); h, w = a.shape[:2]
    o = oiio.ImageOutput.create(p); o.open(p, oiio.ImageSpec(w, h, 3, oiio.UINT8)); o.write_image(a); o.close()
def luma(a): return 0.2126*a[...,0] + 0.7152*a[...,1] + 0.0722*a[...,2]
def crop(a, x0, y0, x1, y1): return a[y0:y1, x0:x1]
def up(a, k): return np.repeat(np.repeat(a, k, 0), k, 1)
def down(a, k):
    h, w = a.shape[0]//k*k, a.shape[1]//k*k
    return a[:h, :w].reshape(h//k, k, w//k, k, 3).mean((1, 3))
def stretch(ims, lo=1, hi=99):
    """percentile stretch with ONE common range over all images (so they stay comparable)"""
    v = np.concatenate([luma(i).ravel() for i in ims]); a, b = np.percentile(v, lo), np.percentile(v, hi)
    b = max(b, a + 1)
    return [np.clip((i - a) * 255.0 / (b - a), 0, 255) for i in ims]
def hst(ims, gap=6, col=255):
    h = max(i.shape[0] for i in ims); out = []
    for k, i in enumerate(ims):
        if i.shape[0] < h: i = np.concatenate([i, np.zeros((h - i.shape[0], i.shape[1], 3), np.float32)], 0)
        out.append(i)
        if k < len(ims) - 1: out.append(np.full((h, gap, 3), col, np.float32))
    return np.concatenate(out, 1)
def vst(ims, gap=6, col=255):
    w = max(i.shape[1] for i in ims); out = []
    for k, i in enumerate(ims):
        if i.shape[1] < w: i = np.concatenate([i, np.zeros((i.shape[0], w - i.shape[1], 3), np.float32)], 1)
        out.append(i)
        if k < len(ims) - 1: out.append(np.full((gap, w, 3), col, np.float32))
    return np.concatenate(out, 0)
def label(a, text, size=16):
    """burn a label into the top-left corner (OIIO render_text; silently skipped if no font)"""
    b = oiio.ImageBuf(oiio.ImageSpec(a.shape[1], a.shape[0], 3, oiio.FLOAT)); b.set_pixels(oiio.ROI(), (np.clip(a,0,255)/255).astype(np.float32))
    try:
        oiio.ImageBufAlgo.fill(b, (0, 0, 0), oiio.ROI(0, min(a.shape[1], 9*len(text)+12), 0, size+8))
        oiio.ImageBufAlgo.render_text(b, 4, size+2, text, size, "", (1, 1, 0.3))
    except Exception: return a
    return np.asarray(b.get_pixels(oiio.FLOAT)).reshape(a.shape[0], a.shape[1], 3) * 255.0
def diffmap(a, b, gain=8):
    d = np.abs(a - b).max(2) * gain
    return np.repeat(np.clip(d, 0, 255)[..., None], 3, 2)
