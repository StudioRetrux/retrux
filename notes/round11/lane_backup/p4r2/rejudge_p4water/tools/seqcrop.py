# flicker heat map location + stacked consecutive-frame crops (bottom-up frames)
import sys, os, zlib, json, numpy as np, OpenImageIO as oiio
out, k0, n, x0, x1, y0, y1, z = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), *map(int, sys.argv[4:9])
dirs = sys.argv[9:]
def fr(d, k):
    m = json.load(open(os.path.join(d, "meta.json"))); W = m["W"]; Y0, Y1 = m["y0"], m["y1"]; R = Y1 - Y0
    b = np.frombuffer(zlib.decompress(open(os.path.join(d, f"f{k:04d}.bin"), "rb").read()), dtype=np.uint8)
    a = b.reshape(R, W, b.size // (W * R))[::-1, :, :3].astype(np.float32)
    return a[y0 - Y0:y1 - Y0, x0:x1]
rows = []
for d in dirs:
    row = [np.repeat(np.repeat(fr(d, k), z, 0), z, 1) for k in range(k0, k0 + n)]
    sep = np.full((row[0].shape[0], 3, 3), 255.0)
    r = row[0]
    for x in row[1:]: r = np.concatenate([r, sep, x], 1)
    rows.append(r)
img = rows[0]
for r in rows[1:]: img = np.concatenate([img, np.full((3, img.shape[1], 3), 255.0), r], 0)
img = np.clip(img, 0, 255).astype(np.uint8)
o = oiio.ImageOutput.create(out); o.open(out, oiio.ImageSpec(img.shape[1], img.shape[0], 3, oiio.UINT8)); o.write_image(img); o.close()
# where is the flicker? per 160 px column block over k0..k0+60
for d in dirs:
    S = [fr(d, k) for k in range(k0, k0 + 60)]
    Ls = [s[..., 0] * 0.2126 + s[..., 1] * 0.7152 + s[..., 2] * 0.0722 for s in S]
    dd = [Ls[i + 1] - Ls[i] for i in range(len(Ls) - 1)]
    f = np.mean([(((dd[i] > 8) & (dd[i + 1] < -8)) | ((dd[i] < -8) & (dd[i + 1] > 8))) for i in range(len(dd) - 1)], 0)
    print(os.path.basename(d), "flicker% per 60px col block:", " ".join(f"{f[:, j:j+60].mean()*100:.1f}" for j in range(0, f.shape[1], 60)))
