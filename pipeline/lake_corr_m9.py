# Round 11 (ENV lane, step 2): the mirror lake's static rest correction (A1 2.1 #12, optional item): a heavily blurred ratio
# of the projected plate's lake to the engine's planar-mirror lake at the rest pose, averaged over several pinned clock times
# (so the live clouds' drift averages out), stored on the PLATE camera's uv grid (overscan included). The water indexes it by
# the lake point's rest-camera projection, so it is fixed on the water plane: it cannot ghost when the camera moves.
#   BPY -I lake_corr_m9.py <out.png> <mask_nowater.png> <lane_ref.png> base=a.png,b.png lane=c.png,d.png [prev=old.png]
#       [sigma=16] [lo=0.8] [hi=1.3] [W=144] [H=96] [fary=565] [farf=40]
# mask: a capture with the water hidden (same pose / clock as lane_ref): water = pixels that change. Values: log2(ratio) per
# channel, 8 bit, 0.5 = x1, range x0.707..x1.414. With prev=, the new ratio multiplies the previous map (iteration).
import sys, json
import numpy as np
import OpenImageIO as oiio

out, maskp, refp = sys.argv[1], sys.argv[2], sys.argv[3]
F = dict(a.split("=", 1) for a in sys.argv[4:] if "=" in a)
SIG = float(F.get("sigma", 16)); LO = float(F.get("lo", 0.8)); HI = float(F.get("hi", 1.3))
GW, GH = int(F.get("W", 144)), int(F.get("H", 96))
OX, OT, OB = 0.15, 0.20, 0.13                     # plate overscan (x, top, bottom)

def rd(p):
    return oiio.ImageBuf(p).get_pixels(oiio.FLOAT)[..., :3].astype(np.float64)
def lin(a):
    return np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
base = np.mean([lin(rd(p)) for p in F["base"].split(",")], 0)
lane = np.mean([lin(rd(p)) for p in F["lane"].split(",")], 0)
ref, nw = rd(refp), rd(maskp)
H, W = ref.shape[:2]
mask = (np.abs(ref - nw).max(-1) > 3.0 / 255.0).astype(np.float64)
mask[: int(0.55 * H)] = 0.0                        # the lake band only (y > 421)
# Far water only (rows above FAR_Y, faded over FAR_F px): there the reflection is a smooth wash that moves little with the
# camera. Near the rocks and floes the two lakes disagree about the near objects' reflections, and a static patch would
# show as a fixed smudge beside a moving reflection off the rest pose.
FAR_Y, FAR_F = float(F.get("fary", 565)), float(F.get("farf", 40))
rows = np.arange(H, dtype=np.float64)[:, None]
farw = np.clip((FAR_Y + FAR_F / 2 - rows) / FAR_F, 0.0, 1.0)

def gblur(a, s):
    r = int(3 * s)
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / s) ** 2); k /= k.sum()
    pad = lambda x, ax: np.pad(x, [(r, r) if i == ax else (0, 0) for i in range(x.ndim)], mode="edge")
    a = np.apply_along_axis(lambda v: np.convolve(v, k, mode="valid"), 0, pad(a, 0))
    return np.apply_along_axis(lambda v: np.convolve(v, k, mode="valid"), 1, pad(a, 1))
m3 = mask[..., None]
wsum = gblur(mask, SIG)
nb = np.stack([gblur(base[..., c] * mask, SIG) for c in range(3)], -1)
nl = np.stack([gblur(lane[..., c] * mask, SIG) for c in range(3)], -1)
R = np.clip(nb / np.maximum(nl, 1e-6), LO, HI)
k = (np.clip(wsum / 0.3, 0.0, 1.0) * farw)[..., None]
R = 1.0 + (R - 1.0) * k

# plate-uv grid -> rest frame px (edge-extended), bilinear
u = (np.arange(GW) + 0.5) / GW
v = (np.arange(GH) + 0.5) / GH                    # v from the BOTTOM (GL)
fx = (u * (1 + 2 * OX) - OX) * W - 0.5
fy = H - (v * (1 + OT + OB) - OB) * H - 0.5       # rows from the top
X, Y = np.meshgrid(np.clip(fx, 0, W - 1.001), np.clip(fy, 0, H - 1.001))
x0, y0 = np.floor(X).astype(int), np.floor(Y).astype(int)
ax, ay = (X - x0)[..., None], (Y - y0)[..., None]
G = (R[y0, x0] * (1 - ax) + R[y0, x0 + 1] * ax) * (1 - ay) + (R[y0 + 1, x0] * (1 - ax) + R[y0 + 1, x0 + 1] * ax) * ay
if "prev" in F:
    P = oiio.ImageBuf(F["prev"]).get_pixels(oiio.FLOAT)[..., :3][::-1].astype(np.float64)   # rows from the bottom
    G = G * np.exp2(P - 0.5)
G = np.clip(G, 2 ** -0.5, 2 ** 0.5)
enc = np.clip(np.log2(G) + 0.5, 0, 1)[::-1]       # image rows top-down
o = oiio.ImageBuf(oiio.ImageSpec(GW, GH, 3, oiio.UINT8))
o.set_pixels(oiio.ROI(), np.ascontiguousarray((enc * 255 + 0.5).astype(np.uint8)))
o.write(out)
lake = mask > 0.5
print(json.dumps({"out": out, "water_px": int(lake.sum()), "ratio_on_water_mean": np.round(R[lake].mean(0), 4).tolist(),
                  "ratio_p5": np.round(np.percentile(R[lake], 5, axis=0), 3).tolist(), "ratio_p95": np.round(np.percentile(R[lake], 95, axis=0), 3).tolist(),
                  "grid_min": round(float(G.min()), 3), "grid_max": round(float(G.max()), 3)}))
# preview of the screen-space ratio (luma) x: 0.8 -> black, 1.3 -> white, plus the mask
pv = np.clip((R @ np.array([0.2126, 0.7152, 0.0722]) - LO) / (HI - LO), 0, 1)
pv = np.concatenate([pv, mask], 0)[..., None].repeat(3, -1)
o2 = oiio.ImageBuf(oiio.ImageSpec(W, 2 * H, 3, oiio.UINT8)); o2.set_pixels(oiio.ROI(), np.ascontiguousarray((pv * 255).astype(np.uint8)))
o2.write(out.replace(".png", "_preview.png"))
