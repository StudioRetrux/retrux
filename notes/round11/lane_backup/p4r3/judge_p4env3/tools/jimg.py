# judge image helper (Blender python, -I)
import sys, os, glob
import numpy as np
import OpenImageIO as oiio
def load(p):
    b = oiio.ImageBuf(p); a = b.get_pixels(oiio.UINT8)
    s = b.spec(); a = np.asarray(a).reshape(s.height, s.width, s.nchannels)
    return a[:, :, :3].astype(np.float32)
def save(p, a):
    a = np.clip(a, 0, 255).astype(np.uint8); h, w, c = a.shape
    out = oiio.ImageOutput.create(p); out.open(p, oiio.ImageSpec(w, h, c, oiio.UINT8)); out.write_image(a); out.close()
def luma(a): return a[...,0]*0.2126+a[...,1]*0.7152+a[...,2]*0.0722
cmd = sys.argv[1]
if cmd == 'sweepdiff':
    A, B = sys.argv[2], sys.argv[3]   # dirs
    names = sys.argv[4:]
    for n in names:
        pa, pb = os.path.join(A, n), os.path.join(B, n)
        if not (os.path.exists(pa) and os.path.exists(pb)): print(n, 'missing'); continue
        a, b = load(pa), load(pb)
        if a.shape != b.shape: print(n, 'shape', a.shape, b.shape); continue
        d = np.abs(a - b).max(axis=2)
        ys, xs = np.nonzero(d > 2)
        bb = (xs.min(), ys.min(), xs.max(), ys.max()) if len(xs) else None
        # cluster summary by coarse grid 80px
        cells = {}
        for x, y in zip(xs, ys):
            k = (x // 80 * 80, y // 80 * 80); cells[k] = cells.get(k, 0) + 1
        top = sorted(cells.items(), key=lambda kv: -kv[1])[:8]
        print(f"{n:28s} max {d.max():5.0f} mean {d.mean():.3f} n>2 {int((d>2).sum()):7d} n>8 {int((d>8).sum()):6d} bbox {bb} top {top}")
elif cmd == 'diffmap':
    out, a, b = sys.argv[2], load(sys.argv[3]), load(sys.argv[4]); gain = float(sys.argv[5]) if len(sys.argv) > 5 else 8
    d = np.abs(a - b).max(axis=2, keepdims=True) * gain
    save(out, np.repeat(d, 3, axis=2))
elif cmd == 'grid':
    # grid out x,y,w,h scale stretch cols labels? imgs...
    out = sys.argv[2]; x, y, w, h = [int(v) for v in sys.argv[3].split(',')]; sc = int(sys.argv[4]); st = sys.argv[5]; cols = int(sys.argv[6])
    ims = [load(p)[y:y+h, x:x+w] for p in sys.argv[7:]]
    if st == 'eq':  # ffmpeg-like eq=contrast=4:brightness=-0.3 approx: (v-0.5)*4+0.5-0.3 in 0..1 -- applied about mean of crop instead
        res = []
        for i in ims:
            v = i / 255.0; v = (v - 0.5) * 4 + 0.5 - 0.3; res.append(v * 255)
        ims = res
    elif st == 'pct':
        allv = np.concatenate([i.reshape(-1, 3) for i in ims]); lo, hi = np.percentile(allv, 1), np.percentile(allv, 99)
        ims = [(i - lo) / max(hi - lo, 1) * 255 for i in ims]
    ims = [np.repeat(np.repeat(i, sc, 0), sc, 1) for i in ims]
    hh, ww = ims[0].shape[:2]; rows = (len(ims) + cols - 1) // cols
    g = np.zeros((rows * (hh + 4), cols * (ww + 4), 3), np.float32) + 255
    for k, i in enumerate(ims):
        r, c = k // cols, k % cols; g[r*(hh+4):r*(hh+4)+hh, c*(ww+4):c*(ww+4)+ww] = i
    save(out, g)
elif cmd == 'box':
    x, y, w, h = [int(v) for v in sys.argv[2].split(',')]
    for p in sys.argv[3:]:
        a = load(p)[y:y+h, x:x+w]; L = luma(a)
        print(f"{os.path.basename(os.path.dirname(p))}/{os.path.basename(p):24s} mean {a.reshape(-1,3).mean(0).round(1)} luma {L.mean():.1f} p10 {np.percentile(L,10):.1f} min {L.min():.0f} sd {L.std():.2f} n<50 {(L<50).sum()}")
elif cmd == 'row':
    p, y, x0, x1 = sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
    a = luma(load(p))
    print(os.path.basename(p), ' '.join(f"{v:.0f}" for v in a[y, x0:x1]))
elif cmd == 'col':
    p, x, y0, y1 = sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
    a = luma(load(p))
    print(os.path.basename(p), ' '.join(f"{v:.0f}" for v in a[y0:y1, x]))
