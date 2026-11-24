# dsum.py dirA dirB [thr] : per shot, px > thr, max, bbox, and the clusters' boxes (coarse)
import sys, os, glob
import numpy as np
import OpenImageIO as oiio
def load(p):
    b = oiio.ImageBuf(p); s = b.spec()
    return np.asarray(b.get_pixels(oiio.UINT8)).reshape(s.height, s.width, s.nchannels)[:, :, :3].astype(np.int16)
A, B = sys.argv[1], sys.argv[2]; thr = float(sys.argv[3]) if len(sys.argv) > 3 else 2
for p in sorted(glob.glob(A + '/*.png')):
    n = os.path.basename(p); q = os.path.join(B, n)
    if not os.path.exists(q): continue
    a, b = load(p), load(q); d = np.abs(a - b).max(2); m = d > thr
    if not m.any(): print(f"{n:24s} same (max {d.max()})"); continue
    ys, xs = np.nonzero(m)
    # coarse 40px grid cells with changes
    cells = sorted(set(zip((ys // 40 * 40).tolist(), (xs // 40 * 40).tolist())))
    la = (a * [0.2126, 0.7152, 0.0722]).sum(2); lb = (b * [0.2126, 0.7152, 0.0722]).sum(2)
    print(f"{n:24s} n>{thr:g} {int(m.sum()):6d} max {d.max():3d} bbox x{xs.min()}-{xs.max()} y{ys.min()}-{ys.max()} dL(mean over changed) {(la-lb)[m].mean():+.1f} cells {len(cells)}")
