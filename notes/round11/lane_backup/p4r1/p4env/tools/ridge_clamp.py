# p4env G4 slits: lift only the darkest outlier texels behind the right-orbit slits to a floor of F x their local 9x9 mean
# (linear light; the mean is what the rest view's coarse mip reads, so the rest view barely moves).
#   python -I ridge_clamp.py <tex_in.png> <uv.json> <tag> <capture.png> <tex_out.png> <F> <thresh>
import sys, json
import numpy as np
import OpenImageIO as oiio
tin, uvf, tag, capf, tout, F, th = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5], float(sys.argv[6]), float(sys.argv[7])
def load(p):
    b = oiio.ImageBuf(p); return np.asarray(b.get_pixels(oiio.FLOAT)).reshape(b.spec().height, b.spec().width, -1)[:, :, :3]
def lin(c): return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def srgb(c):
    c = np.clip(c, 0, 1); return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)
t = load(tin); TH, TW = t.shape[:2]
cap = load(capf); L = cap @ np.array([0.2126, 0.7152, 0.0722])
r = json.load(open(uvf))[tag]["out"]
# flagged slit pixels: darker than the 21x21 screen median by th/255
flag = set()
for s in r:
    if s[2] != "V2_Ridge": continue
    x, y = s[0], s[1]
    w = L[max(0, y - 10):y + 11, max(0, x - 10):x + 11]
    if L[y, x] < np.median(w) - th / 255: flag.add((x, y))
M = np.zeros((TH, TW), bool)
for s in r:
    if s[2] == "V2_Ridge" and any((s[0] + dx, s[1] + dy) in flag for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
        x, y = int(s[3]), int(s[4])
        M[max(0, y - 1):y + 2, max(0, x - 1):x + 2] = True
tl = lin(t)
Y = tl @ np.array([0.2126, 0.7152, 0.0722])
# local 9x9 mean of the (linear) luminance, excluding the empty gutter (Y ~ 0)
valid = (Y > 1e-4).astype(float)
k = 4
acc = np.zeros_like(Y); cnt = np.zeros_like(Y)
for dy in range(-k, k + 1):
    for dx in range(-k, k + 1):
        acc += np.roll(np.roll(Y * valid, dy, 0), dx, 1); cnt += np.roll(np.roll(valid, dy, 0), dx, 1)
mean = acc / np.maximum(cnt, 1)
floor = F * mean
lift = M & (Y < floor) & (valid > 0)
g = np.ones_like(Y); g[lift] = floor[lift] / np.maximum(Y[lift], 1e-4)
g = np.minimum(g, 4.0)
out = srgb(tl * g[:, :, None])
o = oiio.ImageOutput.create(tout); a = np.clip(np.round(out * 255), 0, 255).astype(np.uint8)
o.open(tout, oiio.ImageSpec(TW, TH, 3, oiio.UINT8)); o.write_image(a); o.close()
print(f"flagged px {len(flag)}, candidate texels {int(M.sum())}, lifted {int(lift.sum())}, gain p50/p95 {np.percentile(g[lift],[50,95]).round(2) if lift.any() else '-'}")
