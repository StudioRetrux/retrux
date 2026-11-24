# pdiff.py A_dir B_dir outprefix : per pose |A-B| stats + amplified diff map (A shown dim underneath)
import sys, os, numpy as np, OpenImageIO as oiio
A, B, pre = sys.argv[1:4]
P = ['q00_rest','q01_loop15','q02_loop30','q03_eye','p04_expand_pop','p05_expand','p06_sustain','p07_release_snap','p08_release_home']
def rd(p): return oiio.ImageBuf(p).get_pixels(oiio.FLOAT)[..., :3] * 255.0
for p in P:
    a = rd(f'{A}/{p}.png'); b = rd(f'{B}/{p}.png')
    d = np.abs(a - b).max(-1)
    ys, xs = np.nonzero(d > 2)
    bb = (xs.min(), ys.min(), xs.max(), ys.max()) if len(xs) else None
    # rows > 600 (water / bottom of frame), changed px
    print(f'{p:18s} px>2 {int((d>2).sum()):6d} >8 {int((d>8).sum()):6d} >32 {int((d>32).sum()):5d} max {d.max():5.0f} bbox {bb} | rows>=560 px>2 {int((d[560:]>2).sum())} >8 {int((d[560:]>8).sum())}')
    m = np.clip(d / 32.0, 0, 1)
    img = a / 255.0 * 0.45; img[..., 0] = np.maximum(img[..., 0], m); img[..., 1] = np.maximum(img[..., 1], m * 0.35)
    o = oiio.ImageOutput.create(f'{pre}_{p}.png'); o.open(f'{pre}_{p}.png', oiio.ImageSpec(img.shape[1], img.shape[0], 3, oiio.UINT8)); o.write_image(np.clip(img, 0, 1).astype(np.float32)); o.close()
