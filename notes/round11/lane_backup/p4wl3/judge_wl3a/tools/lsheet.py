# judge_wl3a: luma contrast-stretched sheet (one range from the first dir's crops), 4 frames + 3 diffs x6. usage: lsheet.py OUT Z x0 x1 y0 y1 k0 DIR...
import sys, json, zlib, numpy as np, OpenImageIO as oiio
LU = np.array([0.2126, 0.7152, 0.0722], np.float32)
out, Z = sys.argv[1], int(sys.argv[2]); x0, x1, y0, y1, k0 = map(float, sys.argv[3:8]); dirs = sys.argv[8:]; ks = [int(k0) + j for j in range(4)]
def load(d, i, m):
    W = m["W"]; H = m["y1"] - m["y0"]
    return np.frombuffer(zlib.decompress(open(d + "/f%04d.bin" % i, "rb").read()), np.uint8).reshape(H, W, 4)[::-1, :, :3].astype(np.float32) @ LU
crops = []
for d in dirs:
    m = json.load(open(d + "/meta.json")); k = m["W"] / float(m.get("vw", 1440))
    r0, r1 = int(round(y0 * k)) - m["y0"], int(round(y1 * k)) - m["y0"]; e0, e1 = int(round(x0 * k)), int(round(x1 * k))
    crops.append([load(d, i, m)[r0:r1, e0:e1] for i in ks])
lo = np.percentile(np.stack(crops[0]), 1); hi = np.percentile(np.stack(crops[0]), 99); rows = []
for C in crops:
    f = [np.clip((c - lo) / (hi - lo), 0, 1) for c in C]; dd = [np.clip(np.abs(C[i + 1] - C[i]) * 6 / 255.0, 0, 1) for i in range(3)]
    sep = np.ones((C[0].shape[0], 2)) * 0.5; rows.append(np.concatenate(sum([[x, sep] for x in f + dd], [])[:-1], 1)); rows.append(np.ones((2, rows[-1].shape[1])) * 0.5)
img = np.kron(np.concatenate(rows[:-1], 0), np.ones((Z, Z))); img = (np.repeat(img[:, :, None], 3, 2) * 255).astype(np.uint8)
o = oiio.ImageOutput.create(out); o.open(out, oiio.ImageSpec(img.shape[1], img.shape[0], 3, "uint8")); o.write_image(img); o.close(); print(out, img.shape, "range", lo, hi)
