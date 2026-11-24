# p4env: flag artefact pixels in a capture (bright or dark outliers vs a local median) and map them to texels via a uvprobe job.
#   python -I flag.py <uv.json> <tag> <capture.png> <bright|dark> <thresh> <out_prefix> [mesh]
# Writes <out_prefix>_texels.json {mesh: [[tx, ty], ...]} and prints counts + texel bboxes.
import sys, json
import numpy as np
import OpenImageIO as oiio


def load(p):
    b = oiio.ImageBuf(p)
    a = np.asarray(b.get_pixels(oiio.FLOAT)).reshape(b.spec().height, b.spec().width, -1)[:, :, :3] * 255
    return a


uvf, tag, cap, mode, th, outp = sys.argv[1:7]
only = sys.argv[7] if len(sys.argv) > 7 else None
th = float(th)
r = json.load(open(uvf))[tag]
img = load(cap)
L = img[:, :, 0] * 0.2126 + img[:, :, 1] * 0.7152 + img[:, :, 2] * 0.0722
xs = [s[0] for s in r["out"]]
ys = [s[1] for s in r["out"]]
x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
# local median 7x7
pad = 3
Lp = np.pad(L, pad, mode="edge")
win = np.lib.stride_tricks.sliding_window_view(Lp, (7, 7))
med = np.median(win, axis=(2, 3))
dev = L - med
flag = dev > th if mode == "bright" else dev < -th
out = {}
mask = np.zeros_like(L, dtype=bool)
for s in r["out"]:
    x, y = s[0], s[1]
    if s[2] is None or not flag[y, x]:
        continue
    if only and s[2] != only:
        continue
    out.setdefault(s[2], []).append([s[3], s[4]])
    mask[y, x] = True
for k, v in out.items():
    a = np.array(v)
    print(f"{tag} {k}: {len(v)} px, texel x {a[:,0].min():.0f}-{a[:,0].max():.0f} y {a[:,1].min():.0f}-{a[:,1].max():.0f}")
json.dump(out, open(outp + "_texels.json", "w"))
# overlay of the flagged pixels on the capture region, 4x
crop = img[y0:y1 + 1, x0:x1 + 1].copy()
m = mask[y0:y1 + 1, x0:x1 + 1]
ov = crop.copy()
ov[m] = [255, 0, 0]
both = np.concatenate([crop, ov], 1)
both = np.repeat(np.repeat(both, 4, 0), 4, 1)
spec = oiio.ImageSpec(both.shape[1], both.shape[0], 3, oiio.UINT8)
o = oiio.ImageOutput.create(outp + "_flag.png")
o.open(outp + "_flag.png", spec)
o.write_image(np.clip(both, 0, 255).astype(np.uint8))
o.close()
