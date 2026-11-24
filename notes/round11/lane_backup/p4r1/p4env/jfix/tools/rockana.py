import sys, json
import numpy as np
import OpenImageIO as oiio
sys.path.insert(0, sys.argv[1]); 
W = sys.argv[1]
def load(p):
    b = oiio.ImageBuf(p); s = b.spec()
    return np.asarray(b.get_pixels(oiio.FLOAT)).reshape(s.height, s.width, s.nchannels)[:, :, :3]
def save(p, a):
    a = np.clip(np.round(a * 255), 0, 255).astype(np.uint8); h, w, c = a.shape
    o = oiio.ImageOutput.create(p); o.open(p, oiio.ImageSpec(w, h, c, oiio.UINT8)); o.write_image(a); o.close()
T = load(W + '/tex/rock_big_4_005.png'); H, Wd = T.shape[:2]
Lm = T @ np.array([0.2126, 0.7152, 0.0722])
# local std 5x5
def boxf(a, r):
    p = np.pad(a, r, mode='edge'); c = np.cumsum(np.cumsum(p, 0), 1); c = np.pad(c, ((1, 0), (1, 0)))
    k = 2 * r + 1
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)
mu = boxf(Lm, 2); sd = np.sqrt(np.maximum(boxf(Lm * Lm, 2) - mu * mu, 0))
uv = json.load(open(sys.argv[2]))['floe']['out']
M0 = np.zeros((H, Wd), bool)
for s in uv:
    if s[2] != 'rock_big_4005': continue
    x, y = int(np.floor(s[3])), int(np.floor(s[4]))
    M0[max(0, y - 1):y + 2, max(0, x - 1):x + 2] = True
print('wedge texels', M0.sum(), 'sd in wedge p50/p90', np.percentile(sd[M0] * 255, [50, 90]).round(2), 'luma mean', (Lm[M0] * 255).mean().round(1))
# show: texture with wedge overlay (red tint) and sd map
vis = T.copy(); vis[M0] = vis[M0] * 0.5 + np.array([0.5, 0, 0])
sdv = np.repeat(np.clip(sd * 255 / 6, 0, 1)[:, :, None], 3, 2)
save(W + '/ev/rock_overlay.png', np.concatenate([vis, sdv], 1))
np.save(W + '/tex/rock_sd.npy', sd)
np.save(W + '/tex/rock_M0.npy', M0)
