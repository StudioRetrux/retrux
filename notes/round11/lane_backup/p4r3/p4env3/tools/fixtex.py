# p4env G4 / G3: screen-driven texel repair. For one artefact: flag its pixels in a capture at a pose, take a target colour per
# pixel (the local median of the unflagged pixels around it, or the reference frame), and move the texels those pixels sample
# (uvprobe.mjs, step 1, same pose) by the linear-light gain target / current, smoothed and dilated over the mip footprint.
#   python -I fixtex.py <spec.json>
# spec: {tex_in, tex_out, mesh, uv, tag, cap, mode: dark|bright|ref, thresh, win, rect: [x,y,w,h] (optional limit),
#        ref (png, mode ref), gmin, gmax, dil (texels), only_rect (optional extra flag limit), report}
import sys, json
import numpy as np
import OpenImageIO as oiio

sp = json.load(open(sys.argv[1]))


def load(p):
    b = oiio.ImageBuf(p)
    return np.asarray(b.get_pixels(oiio.FLOAT)).reshape(b.spec().height, b.spec().width, -1)[:, :, :3]


def save(p, a):
    a = np.clip(np.round(a * 255), 0, 255).astype(np.uint8)
    o = oiio.ImageOutput.create(p)
    o.open(p, oiio.ImageSpec(a.shape[1], a.shape[0], 3, oiio.UINT8))
    o.write_image(a)
    o.close()


def lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


tex = load(sp["tex_in"])
TH, TW = tex.shape[:2]
cap = load(sp["cap"])
H, W = cap.shape[:2]
L = cap @ np.array([0.2126, 0.7152, 0.0722])
r = json.load(open(sp["uv"]))[sp["tag"]]["out"]
xs = np.array([s[0] for s in r])
ys = np.array([s[1] for s in r])
x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
win = int(sp.get("win", 15))
hw = win // 2
mode = sp["mode"]
th = float(sp.get("thresh", 0)) / 255
# flags in the probed region
flag = np.zeros((H, W), bool)
med = np.zeros((H, W))
for y in range(y0, y1 + 1):
    for x in range(x0, x1 + 1):
        w = L[max(0, y - hw):y + hw + 1, max(0, x - hw):x + hw + 1]
        med[y, x] = np.median(w)
if mode == "dark":
    flag[y0:y1 + 1, x0:x1 + 1] = L[y0:y1 + 1, x0:x1 + 1] < med[y0:y1 + 1, x0:x1 + 1] - th
elif mode == "bright":
    flag[y0:y1 + 1, x0:x1 + 1] = L[y0:y1 + 1, x0:x1 + 1] > med[y0:y1 + 1, x0:x1 + 1] + th
elif mode == "ref":
    ref = load(sp["ref"])
    k = 2
    refm = np.zeros_like(ref)
    for dy in range(-k, k + 1):
        for dx in range(-k, k + 1):
            refm += np.roll(np.roll(ref, dy, 0), dx, 1)
    refm /= (2 * k + 1) ** 2
    Lr = refm @ np.array([0.2126, 0.7152, 0.0722])
    flag[y0:y1 + 1, x0:x1 + 1] = np.abs(L[y0:y1 + 1, x0:x1 + 1] - Lr[y0:y1 + 1, x0:x1 + 1]) > th
onmesh = np.zeros((H, W), bool)
for s_ in r:
    if s_[2] == sp["mesh"]:
        onmesh[s_[1], s_[0]] = True
if mode == "mesh":
    # every pixel on the mesh in the probed region; its target = the median of the pixels around it NOT on the mesh
    flag = onmesh.copy()
if sp.get("only_rect"):
    ox, oy, ow, oh = sp["only_rect"]
    keep = np.zeros_like(flag)
    keep[oy:oy + oh, ox:ox + ow] = True
    flag &= keep
# grow the flag by 1 px (the artefact's AA rim)
g = flag.copy()
for dy in ((-1, 0, 1) if mode != "mesh" else ()):
    for dx in (-1, 0, 1):
        g |= np.roll(np.roll(flag, dy, 0), dx, 1)
flag = g
# targets
lg = np.zeros((TH, TW, 3))
wsum = np.zeros((TH, TW))
n = 0
gmin, gmax = float(sp.get("gmin", 0.4)), float(sp.get("gmax", 3.0))
for s in r:
    x, y = s[0], s[1]
    if s[2] != sp["mesh"] or not flag[y, x]:
        continue
    if mode == "ref":
        tgt = refm[y, x]
    else:
        ww = ~(onmesh if mode == "mesh" else flag)[max(0, y - hw):y + hw + 1, max(0, x - hw):x + hw + 1]
        pix = cap[max(0, y - hw):y + hw + 1, max(0, x - hw):x + hw + 1][ww]
        if len(pix) < 8:
            continue
        tgt = np.median(pix, 0)
    cur = cap[y, x]
    gain = np.clip(lin(tgt) / np.maximum(lin(cur), 1e-4), gmin, gmax)
    tx, ty = s[3] - 0.5, s[4] - 0.5
    ix, iy = int(np.floor(tx)), int(np.floor(ty))
    fx, fy = tx - ix, ty - iy
    for (ax, ay, wt) in ((ix, iy, (1 - fx) * (1 - fy)), (ix + 1, iy, fx * (1 - fy)), (ix, iy + 1, (1 - fx) * fy), (ix + 1, iy + 1, fx * fy)):
        if 0 <= ax < TW and 0 <= ay < TH:
            lg[ay, ax] += wt * np.log(gain)
            wsum[ay, ax] += wt
    n += 1
# smooth + dilate the log gain over the mip footprint (normalized box blur, dil texels)
d = int(sp.get("dil", 2))
acc = np.zeros_like(lg)
ws = np.zeros_like(wsum)
for dy in range(-d, d + 1):
    for dx in range(-d, d + 1):
        fall = 1.0 / (1 + dx * dx + dy * dy)
        acc += fall * np.roll(np.roll(lg, dy, 0), dx, 1)
        ws += fall * np.roll(np.roll(wsum, dy, 0), dx, 1)
G = np.exp(acc / np.maximum(ws, 1e-6)[:, :, None])
cover = np.clip(ws / 0.5, 0, 1)[:, :, None]  # fade the correction out where only a sliver of weight reached
G = 1 + (G - 1) * cover
G[ws <= 1e-6] = 1
out = srgb(lin(tex) * G)
changed = np.abs(out - tex).max(2) > 0.5 / 255
save(sp["tex_out"], out)
print(f"{sp['tag']}: {int(flag.sum())} flagged px, {n} mapped to {sp['mesh']}, {int(changed.sum())} texels changed, "
      f"gain luma p5/p50/p95 {np.percentile((G @ np.array([0.2126,0.7152,0.0722]))[changed], [5,50,95]).round(2) if changed.any() else '-'}")
