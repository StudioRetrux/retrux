# Round 11 (ENV lane): the lake mirror's sky. Reads the world-only Nishita equirect from render_sky_equirect.py
# (2048 x 1024 half, three.js equirect orientation as pano_orb.exr), tones the sun disc down (its 18 px reach the half-float
# max 65504; clamped to luminance LMAX with the hue kept, so mips and bilinear lookups never smear it), box-downsamples by
# FACTOR and writes a half-float ZIP EXR for public/hero.
#   BPY -I encode_sky_m9.py <in.exr> <out.exr> [LMAX=30] [FACTOR=2]
import sys, json
import numpy as np
import OpenImageIO as oiio

src, dst = sys.argv[1], sys.argv[2]
LMAX = float(sys.argv[3]) if len(sys.argv) > 3 else 30.0
F = int(sys.argv[4]) if len(sys.argv) > 4 else 2
a = oiio.ImageBuf(src).get_pixels(oiio.FLOAT)[..., :3].astype(np.float64)
L = a @ np.array([0.2126, 0.7152, 0.0722])
k = np.minimum(1.0, LMAX / np.maximum(L, 1e-9))
clamped = int((k < 1.0).sum())
a *= k[..., None]
H, W = a.shape[:2]
a = a.reshape(H // F, F, W // F, F, 3).mean((1, 3))
spec = oiio.ImageSpec(W // F, H // F, 3, oiio.HALF)
spec.attribute("compression", "zip")
out = oiio.ImageBuf(spec)
out.set_pixels(oiio.ROI(), np.ascontiguousarray(a.astype(np.float32)))
out.write(dst)
Lo = a @ np.array([0.2126, 0.7152, 0.0722])
print(json.dumps({"in": src, "out": dst, "size": [W // F, H // F], "clamped_px": clamped, "lmax": LMAX,
                  "max_luma_out": round(float(Lo.max()), 3), "upper_mean": np.round(a[: H // F // 2].mean((0, 1)), 4).tolist()}))
