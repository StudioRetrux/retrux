# p4env image helper (Blender python: numpy + OpenImageIO). Run with -I.
#   grid  <out.png> <x,y,w,h> <scale> <stretch 0|1> <cols> img1 img2 ...   crops (nearest upscale), optional per-grid contrast stretch
#   diff  <out.png> <a> <b> [gain=8] [x,y,w,h]                             abs diff map (gain), optional crop
#   box   <x,y,w,h> img1 img2 ...                                          mean RGB of a box per image
#   maxdiff <a> <b> [x,y,w,h]                                              max/mean abs diff and count > 2, > 8
#   rows  <img> <x0,x1> <y0,y1>                                            luma per row (mean over x range)
import sys
import numpy as np
import OpenImageIO as oiio


def load(p):
    b = oiio.ImageBuf(p)
    a = b.get_pixels(oiio.UINT8)
    a = np.asarray(a).reshape(b.spec().height, b.spec().width, b.spec().nchannels)
    return a[:, :, :3].astype(np.float32)


def save(p, a):
    a = np.clip(a, 0, 255).astype(np.uint8)
    h, w, c = a.shape
    spec = oiio.ImageSpec(w, h, c, oiio.UINT8)
    out = oiio.ImageOutput.create(p)
    out.open(p, spec)
    out.write_image(a)
    out.close()


def rect(s):
    x, y, w, h = [int(v) for v in s.split(",")]
    return x, y, w, h


def crop(a, r):
    x, y, w, h = r
    return a[y:y + h, x:x + w]


cmd = sys.argv[1]
if cmd == "grid":
    out, r, sc, st, cols = sys.argv[2], rect(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6])
    ims = [crop(load(p), r) for p in sys.argv[7:]]
    if st:
        allv = np.concatenate([i.reshape(-1, 3) for i in ims])
        lo, hi = np.percentile(allv, 1), np.percentile(allv, 99)
        ims = [(i - lo) / max(hi - lo, 1) * 255 for i in ims]
    ims = [np.repeat(np.repeat(i, sc, 0), sc, 1) for i in ims]
    h, w = ims[0].shape[:2]
    rows = (len(ims) + cols - 1) // cols
    g = np.zeros((rows * (h + 4), cols * (w + 4), 3), np.float32) + 255
    for k, i in enumerate(ims):
        rr, cc = k // cols, k % cols
        g[rr * (h + 4):rr * (h + 4) + h, cc * (w + 4):cc * (w + 4) + w] = i
    save(out, g)
elif cmd == "diff":
    out, a, b = sys.argv[2], load(sys.argv[3]), load(sys.argv[4])
    gain = float(sys.argv[5]) if len(sys.argv) > 5 else 8
    if len(sys.argv) > 6:
        r = rect(sys.argv[6])
        a, b = crop(a, r), crop(b, r)
    save(out, np.abs(a - b) * gain)
elif cmd == "box":
    r = rect(sys.argv[2])
    for p in sys.argv[3:]:
        m = crop(load(p), r).reshape(-1, 3).mean(0)
        print(f"{p.split('/')[-1]:<40} {m[0]:7.1f} {m[1]:7.1f} {m[2]:7.1f}  L {0.2126*m[0]+0.7152*m[1]+0.0722*m[2]:7.1f}")
elif cmd == "maxdiff":
    a, b = load(sys.argv[2]), load(sys.argv[3])
    if len(sys.argv) > 4:
        r = rect(sys.argv[4])
        a, b = crop(a, r), crop(b, r)
    d = np.abs(a - b).max(2)
    ys, xs = np.nonzero(d > 2)
    bb = (xs.min(), ys.min(), xs.max(), ys.max()) if len(xs) else None
    print(f"max {d.max():.0f} mean {d.mean():.4f} n>2 {(d > 2).sum()} n>8 {(d > 8).sum()} bbox>2 {bb}")
elif cmd == "rows":
    a = load(sys.argv[2])
    x0, x1 = [int(v) for v in sys.argv[3].split(",")]
    y0, y1 = [int(v) for v in sys.argv[4].split(",")]
    L = (a[:, :, 0] * 0.2126 + a[:, :, 1] * 0.7152 + a[:, :, 2] * 0.0722)
    for y in range(y0, y1):
        print(y, " ".join(f"{v:5.1f}" for v in L[y, x0:x1]))
