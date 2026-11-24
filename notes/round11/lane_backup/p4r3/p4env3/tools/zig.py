import sys, json
import numpy as np
import OpenImageIO as oiio
W = sys.argv[1]
def load(p):
    b = oiio.ImageBuf(p); s = b.spec()
    return np.asarray(b.get_pixels(oiio.UINT8)).reshape(s.height, s.width, s.nchannels)[:, :, :3].astype(np.float32)
img = load(W + '/before/late90_rest.png'); L = img @ np.array([0.2126, 0.7152, 0.0722])
img0 = load(W + '/before/ptr_rest.png'); L0 = img0 @ np.array([0.2126, 0.7152, 0.0722])
T = load(W + '/tex/V2_Massif_f1.png'); TL = T @ np.array([0.2126, 0.7152, 0.0722])
out = json.load(open(W + '/uv_zig.json'))['zig']['out']
pix = {(s[0], s[1]): s for s in out}
# zig-zag pixels: brighter than the 5x5 median by > 12 at t~92
rows = []
for (x, y), s in pix.items():
    if not (264 <= x <= 285 and 237 <= y <= 249): continue
    win = L[y - 2:y + 3, x - 2:x + 3]
    d = L[y, x] - np.median(win)
    if d > 12:
        tx, ty = s[3], s[4]
        tl = TL[int(ty), int(tx)]
        tw = TL[max(0, int(ty) - 3):int(ty) + 4, max(0, int(tx) - 3):int(tx) + 4]
        rows.append((x, y, round(float(d), 1), round(float(L0[y, x] - np.median(L0[y-2:y+3, x-2:x+3])), 1), s[2], tx, ty, s[5], s[7], round(float(tl), 1), round(float(np.median(tw)), 1)))
print('zig px (x, y, d_t92, d_t8.5, mesh, tx, ty, side, tri, texel luma, texel 7x7 median):')
for r in sorted(rows): print(r)
# UV continuity: max texel jump between horizontally adjacent pixels in the region
jumps = []
for (x, y), s in pix.items():
    n = pix.get((x + 1, y))
    if n and n[2] == s[2]:
        jumps.append((abs(n[3] - s[3]) + abs(n[4] - s[4]), x, y, s[7], n[7]))
jumps.sort(reverse=True); print('largest texel jumps between neighbours:', jumps[:6])
