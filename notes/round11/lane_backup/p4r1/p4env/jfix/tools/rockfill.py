# J1 (G3a): give rock_big_4.005's flat light-bake fill (texels only the pop / dolly path sees) the rock's own texture detail:
# new = fill * clamp(detail ratio of the rock's plate-textured part at an offset, rmin, rmax), linear light, luma ratio (hue kept),
# feathered over FE texels at the edit's edge. Only texels within DIL of the wedge's sampled texels change.
#   python -I rockfill.py <W> <uv3.json> <dx> <dy> <out.png>
import sys, json
import numpy as np
import OpenImageIO as oiio
W, UV, DX, DY, OUT = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
DIL, FE, SIG, RMIN, RMAX = 5, 4, 10, 0.55, 1.8
def load(p):
    b = oiio.ImageBuf(p); s = b.spec()
    return np.asarray(b.get_pixels(oiio.FLOAT)).reshape(s.height, s.width, s.nchannels)[:, :, :3].astype(np.float64)
def save(p, a):
    a = np.clip(np.round(a * 255), 0, 255).astype(np.uint8); h, w, c = a.shape
    o = oiio.ImageOutput.create(p); o.open(p, oiio.ImageSpec(w, h, c, oiio.UINT8)); o.write_image(a); o.close()
lin = lambda c: np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
srgb = lambda c: np.where(np.clip(c, 0, 1) <= 0.0031308, np.clip(c, 0, 1) * 12.92, 1.055 * np.clip(c, 0, 1) ** (1 / 2.4) - 0.055)
T = load(W + '/tex/rock_big_4_005.png'); H, Wd = T.shape[:2]
Tl = lin(T); Y = Tl @ np.array([0.2126, 0.7152, 0.0722])
def gblur(a, s):
    r = int(3 * s); k = np.exp(-0.5 * (np.arange(-r, r + 1) / s) ** 2); k /= k.sum()
    p = np.pad(a, r, mode='reflect')
    p = np.apply_along_axis(lambda v: np.convolve(v, k, 'valid'), 0, p)
    return np.apply_along_axis(lambda v: np.convolve(v, k, 'valid'), 1, p)
M0 = np.zeros((H, Wd), bool)
for s in json.load(open(UV))['floe']['out']:
    if s[2] != 'rock_big_4005': continue
    x, y = int(np.floor(s[3])), int(np.floor(s[4]))
    M0[max(0, y - 1):y + 2, max(0, x - 1):x + 2] = True
# distance (chessboard) from M0, up to DIL + FE
dist = np.full((H, Wd), 99.0); dist[M0] = 0
cur = M0.copy()
for d in range(1, DIL + FE + 1):
    g = cur.copy()
    g[1:] |= cur[:-1]; g[:-1] |= cur[1:]; g[:, 1:] |= cur[:, :-1]; g[:, :-1] |= cur[:, 1:]
    dist[g & ~cur] = d; cur = g
w = np.clip((DIL + FE - dist) / FE, 0, 1)  # 1 inside DIL, fades to 0 over FE texels
# detail ratio from the source region (shifted by dx, dy)
Yb = gblur(Y, SIG)
ratio = np.clip(Y / np.maximum(Yb, 1e-5), RMIN, RMAX)
src = np.ones((H, Wd))
ys, xs = np.nonzero(w > 0)
sy, sx = ys + DY, xs + DX
ok = (sy >= 0) & (sy < H) & (sx >= 0) & (sx < Wd)
src[ys[ok], xs[ok]] = ratio[sy[ok], sx[ok]]
G = 1 + (src - 1) * w
out = srgb(Tl * G[:, :, None])
# keep untouched texels bit-exact (8-bit round trip of the decode)
out8 = np.clip(np.round(out * 255), 0, 255); T8 = np.round(T * 255)
out8[w <= 0] = T8[w <= 0]
save(OUT, out8 / 255)
ch = np.abs(out8 - T8).max(2) > 0
print(f"wedge texels {M0.sum()}, edited {int((w > 0).sum())}, changed {int(ch.sum())}, src ratio p5/p50/p95 {np.percentile(src[w>0],[5,50,95]).round(2)}, source box x{xs.min()+DX}-{xs.max()+DX} y{ys.min()+DY}-{ys.max()+DY}")
vis = np.concatenate([T8, out8], 1)[150:430, 330:600].copy() if False else None
